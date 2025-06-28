import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.ts';
import { User } from '../../models/User.ts';
import { Course } from '../../models/Course.ts';
import { Batch } from '../../models/Batch.ts';
import { Exam } from '../../models/Exam.ts';
import { Submission } from '../../models/Submission.ts';
import { Evaluation } from '../../models/Evaluation.ts';
import mongoose from 'mongoose';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const router = Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.post('/update-role', async (req: Request, res: Response): Promise<void> => {
  const { email, role } = req.body;

  if (!email || !role) {
    res.status(400).json({ error: 'Email and role are required' });
    return;
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.role = role;
    await user.save();

    res.json({ message: `Role updated to '${role}' for ${email}` });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: { $in: ['student', 'ta'] } }).select('name email role');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/teacher-courses', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const teacherId = req.user?._id;

    const teacher = await User.findById(teacherId).select('enrolledCourses');
    if (!teacher || !teacher.enrolledCourses || teacher.enrolledCourses.length === 0) {
      res.json([]);
      return;
    }

    const courses = await Course.find({ _id: { $in: teacher.enrolledCourses } });

    const courseBatchList = await Promise.all(
      courses.map(async (course) => {
        const batch = await Batch.findOne({ course: course._id, instructor: teacherId });

        return {
          courseId: course._id,
          courseName: `${course.name} (${course.code})`,
          batchId: batch?._id,
          batchName: batch?.name || 'N/A',
        };
      })
    );

    res.json(courseBatchList);
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fixed: Add k parameter to exam scheduling
router.post('/schedule-exam', authMiddleware, upload.single('solutions'), async (req: any, res: Response): Promise<void> => {
  const { courseId, batchId, title, startTime, endTime, numQuestions, k } = req.body;

  console.log('📋 Exam creation request:', { courseId, batchId, title, startTime, endTime, numQuestions, k });

  if (!courseId || !batchId || !title || !startTime || !endTime || !numQuestions || !k) {
    res.status(400).json({ error: 'All fields are required including k parameter' });
    return;
  }

  try {
    const examData: any = {
      course: courseId,
      batch: batchId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      numQuestions: parseInt(numQuestions),
      k: parseInt(k),
      createdBy: req.user._id,
      questions: []
    };

    // Create placeholder questions
    for (let i = 1; i <= parseInt(numQuestions); i++) {
      examData.questions.push({
        questionText: `Question ${i}`,
        maxMarks: 10
      });
    }

    console.log('💾 Creating exam with data:', examData);
    const exam = await Exam.create(examData);
    console.log('✅ Exam created successfully:', exam._id);

    res.status(201).json({ message: 'Exam scheduled successfully', exam });
  } catch (err) {
    console.error('Exam creation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/exams', authMiddleware, async (req: any, res: Response): Promise<void> => {
  console.log('🧠 Logged in teacher ID:', req.user._id);
  try {
    const teacherId = new mongoose.Types.ObjectId(req.user._id);
    const exams = await Exam.find({ createdBy: teacherId })
      .populate('course', 'name code') 
      .populate('batch', 'name');     
    console.log('📦 Exams found:', exams.length); 

    const examList = await Promise.all(exams.map(async (exam) => {
      const course = exam.course as any;
      const batch = exam.batch as any;

      // Calculate duration
      const startTime = new Date(exam.startTime);
      const endTime = new Date(exam.endTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMins = Math.floor(durationMs / (1000 * 60));

      // Get student count from batch
      const batchData = await Batch.findById(exam.batch).populate('students');
      const totalStudents = batchData?.students?.length || 0;

      return {
        _id: exam._id,
        title: exam.title,
        course: course ? `${course.name} (${course.code})` : 'Unknown Course',
        batch: batch?.name || 'Unknown Batch',
        startTime: exam.startTime?.toLocaleString?.() ?? '',
        endTime: exam.endTime?.toLocaleString?.() ?? '',
        numQuestions: exam.numQuestions ?? 0,
        duration: `${durationMins} mins`,
        totalMarks: (exam.numQuestions ?? 0) * 10,
        k: exam.k ?? 0,
        totalStudents,
        solutions: "Solutions.pdf" // Placeholder
      };
    }));

    res.json(examList);
  } catch (err) {
    console.error('Exam fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get enrolled students for a specific course and batch
router.get('/enrolled-students', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const { courseId, batchId } = req.query;

    console.log('🔍 Fetching students for:', { courseId, batchId });

    if (!courseId || !batchId) {
      res.status(400).json({ error: 'Course ID and Batch ID are required' });
      return;
    }

    const batch = await Batch.findById(batchId).populate('students', 'name email');
    
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const students = batch.students.map((student: any) => ({
      name: student.name,
      email: student.email
    }));

    console.log('👥 Found students:', students.length);
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled students' });
  }
});

// Add this route after the '/enrolled-students' route
router.get('/download-students-csv', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const { courseId, batchId } = req.query;

    if (!courseId || !batchId) {
      res.status(400).json({ error: 'Course ID and Batch ID are required' });
      return;
    }

    // Verify teacher has access to this batch
    const batch = await Batch.findOne({
      _id: batchId,
      instructor: req.user._id
    }).populate('students', 'name email');
    
    if (!batch) {
      res.status(403).json({ error: 'Batch not found or unauthorized access' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Generate CSV content
    let csvContent = "Name,Email,Course,Batch\n";
    
    batch.students.forEach((student: any) => {
      csvContent += `"${student.name}","${student.email}","${course.name} (${course.code})","${batch.name}"\n`;
    });

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${course.code}_${batch.name}_students.csv"`);
    
    // Send the CSV content
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating student CSV:', error);
    res.status(500).json({ error: 'Failed to generate student CSV' });
  }
});

// Enroll students via CSV upload
router.post('/enroll-students', authMiddleware, upload.single('csvFile'), async (req: any, res: Response): Promise<void> => {
  try {
    const { batchId } = req.body;
    const csvFile = req.file;

    console.log('📤 CSV enrollment request:', { batchId, hasFile: !!csvFile });

    if (!batchId || !csvFile) {
      res.status(400).json({ error: 'Batch ID and CSV file are required' });
      return;
    }

    // Parse CSV content
    const csvContent = csvFile.buffer.toString('utf8');
    const lines = csvContent.split('\n').filter((line: string) => line.trim());
    
    console.log('📄 CSV lines:', lines.length);

    if (lines.length < 2) {
      res.status(400).json({ error: 'CSV file must contain at least a header and one data row' });
      return;
    }

    // Parse students from CSV
    const students: { name: string; email: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const [name, email] = lines[i].split(',').map((item: string) => item.trim().replace(/"/g, ''));
      if (name && email) {
        students.push({ name, email });
      }
    }

    console.log('👥 Parsed students:', students);

    const batch = await Batch.findById(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    // Process student enrollment
    const enrolledStudentIds: mongoose.Types.ObjectId[] = [];
    
    for (const studentData of students) {
      const { name, email } = studentData;
      
      let student = await User.findOne({ email });
      
      if (!student) {
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        student = await User.create({
          name,
          email,
          password: hashedPassword,
          role: 'student',
          enrolledCourses: [batch.course]
        });
        console.log('✅ Created new student:', student.email);
      } else {
        if (!student.enrolledCourses.includes(batch.course)) {
          student.enrolledCourses.push(batch.course);
          await student.save();
        }
        console.log('✅ Updated existing student:', student.email);
      }
      
      enrolledStudentIds.push(student._id as mongoose.Types.ObjectId);
    }

    // Add students to batch
    const existingStudentIds = batch.students.map((id: mongoose.Types.ObjectId) => id.toString());
    const newStudentIds = enrolledStudentIds.filter((id: mongoose.Types.ObjectId) => 
      !existingStudentIds.includes(id.toString())
    );
    
    batch.students.push(...newStudentIds);
    await batch.save();

    console.log('✅ Students enrolled successfully:', {
      enrolledCount: newStudentIds.length,
      totalStudents: batch.students.length
    });

    res.status(200).json({ 
      message: 'Students enrolled successfully',
      enrolledCount: newStudentIds.length,
      totalStudents: batch.students.length
    });
  } catch (error) {
    console.error('Error enrolling students:', error);
    res.status(500).json({ error: 'Failed to enroll students' });
  }
});

// Get exam submissions
router.get('/exam-submissions/:examId', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const teacherId = req.user._id;

    // Verify the exam belongs to the teacher
    const exam = await Exam.findOne({ _id: examId, createdBy: teacherId });
    if (!exam) {
      res.status(404).json({ error: 'Exam not found or unauthorized' });
      return;
    }

    const submissions = await Submission.find({ exam: examId })
      .populate('student', 'name email')
      .select('student submittedAt');

    const submissionList = submissions.map(sub => ({
      studentName: (sub.student as any).name,
      studentEmail: (sub.student as any).email,
      submittedAt: sub.submittedAt.toLocaleString()
    }));

    res.json(submissionList);
  } catch (error) {
    console.error('Error fetching exam submissions:', error);
    res.status(500).json({ error: 'Failed to fetch exam submissions' });
  }
});

// Send solutions to students for evaluation
router.post('/send-solutions/:examId', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const teacherId = req.user._id;

    // Verify the exam belongs to the teacher
    const exam = await Exam.findOne({ _id: examId, createdBy: teacherId })
      .populate('batch');
    
    if (!exam) {
      res.status(404).json({ error: 'Exam not found or unauthorized' });
      return;
    }

    // Get all students who submitted for this exam
    const submissions = await Submission.find({ exam: examId })
      .populate('student');

    if (submissions.length === 0) {
      res.status(400).json({ error: 'No submissions found for this exam' });
      return;
    }

    // Create peer evaluation assignments
    const students = submissions.map(sub => sub.student);
    const k = exam.k; // Number of peer evaluations per student

    for (let i = 0; i < students.length; i++) {
      const evaluator = students[i];
      
      // Assign k random evaluatees (excluding self)
      const otherStudents = students.filter((_, index) => index !== i);
      const shuffled = otherStudents.sort(() => 0.5 - Math.random());
      const assignedEvaluatees = shuffled.slice(0, Math.min(k, otherStudents.length));

      for (const evaluatee of assignedEvaluatees) {
        // Check if evaluation assignment already exists
        const existingEvaluation = await Evaluation.findOne({
          exam: examId,
          evaluator: evaluator._id,
          evaluatee: evaluatee._id
        });

        if (!existingEvaluation) {
          await Evaluation.create({
            exam: examId,
            evaluator: evaluator._id,
            evaluatee: evaluatee._id,
            marks: new Array(exam.numQuestions).fill(0),
            feedback: '',
            status: 'pending'
          });
        }
      }
    }

    res.json({ message: 'Solutions sent to students for peer evaluation' });
  } catch (error) {
    console.error('Error sending solutions:', error);
    res.status(500).json({ error: 'Failed to send solutions for evaluation' });
  }
});

// Upload solution PDF for an exam
router.post('/upload-solution/:examId', authMiddleware, upload.single('solutionPdf'), async (req: any, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const solutionFile = req.file;
    
    if (!solutionFile) {
      res.status(400).json({ error: 'No solution file uploaded' });
      return;
    }
    
    const exam = await Exam.findOne({ _id: examId, createdBy: req.user._id });
    if (!exam) {
      res.status(404).json({ error: 'Exam not found or unauthorized' });
      return;
    }
    
    // Store the solution file data in the exam document
    exam.solutionPdf = solutionFile.buffer;
    exam.solutionPdfMimeType = solutionFile.mimetype;
    await exam.save();
    
    res.status(200).json({ message: 'Solution uploaded successfully' });
  } catch (error) {
    console.error('Error uploading solution:', error);
    res.status(500).json({ error: 'Failed to upload solution' });
  }
});

// Get solution PDF for an exam
router.get('/solution/:examId', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ _id: examId, createdBy: req.user._id });
    if (!exam || !exam.solutionPdf) {
      res.status(404).json({ error: 'Solution not found' });
      return;
    }
    
    res.set('Content-Type', exam.solutionPdfMimeType || 'application/pdf');
    res.set('Content-Disposition', `inline; filename="solution_${examId}.pdf"`);
    res.send(exam.solutionPdf);
  } catch (error) {
    console.error('Error retrieving solution:', error);
    res.status(500).json({ error: 'Failed to retrieve solution' });
  }
});

// Edit exam details
router.put('/exam/:examId', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const { title, startTime, endTime, numQuestions, k } = req.body;
    
    const exam = await Exam.findOne({ _id: examId, createdBy: req.user._id });
    if (!exam) {
      res.status(404).json({ error: 'Exam not found or unauthorized' });
      return;
    }
    
    // Update fields
    if (title) exam.title = title;
    if (startTime) exam.startTime = new Date(startTime);
    if (endTime) exam.endTime = new Date(endTime);
    
    // Update questions if number changes
    if (numQuestions && numQuestions !== exam.numQuestions) {
      exam.numQuestions = numQuestions;
      exam.questions = [];
      
      for (let i = 1; i <= numQuestions; i++) {
        exam.questions.push({
          questionText: `Question ${i}`,
          maxMarks: 10
        });
      }
    }
    
    if (k) exam.k = k;
    
    await exam.save();
    
    res.status(200).json({ 
      message: 'Exam updated successfully',
      exam
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// Delete exam
router.delete('/exam/:examId', authMiddleware, async (req: any, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    
    // First check if the exam exists and belongs to this teacher
    const exam = await Exam.findOne({ _id: examId, createdBy: req.user._id });
    if (!exam) {
      res.status(404).json({ error: 'Exam not found or unauthorized' });
      return;
    }
    
    // Delete related evaluations and submissions
    await Evaluation.deleteMany({ exam: examId });
    await Submission.deleteMany({ exam: examId });
    
    // Delete the exam itself
    await Exam.deleteOne({ _id: examId });
    
    res.status(200).json({ message: 'Exam and related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

export default router;