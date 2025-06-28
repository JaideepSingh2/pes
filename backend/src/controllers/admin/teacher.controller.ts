import { Request, Response } from 'express';
import { User } from '../../models/User.ts';
import { Course } from '../../models/Course.ts';
import { Batch } from '../../models/Batch.ts';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const assignTeacherToCourse = async (req: Request, res: Response): Promise<void> => {
  console.log("🧠 assignTeacherToCourse called with body:", req.body);
  try {
    const { email, courseCode } = req.body;
    console.log("Received:", { email, courseCode });

    const teacher = await User.findOne({ email, role: 'teacher' });
    if (!teacher) {
      console.log("❌ Teacher not found");
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }

    const course = await Course.findOne({ code: courseCode });
    if (!course) {
      console.log("❌ Course not found");
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    console.log("✅ Found teacher and course:", { teacherId: teacher._id, courseId: course._id });

    const courseId = new mongoose.Types.ObjectId(course._id as string);

    const alreadyAssigned = teacher.enrolledCourses.some(
      (id) => new mongoose.Types.ObjectId(id.toString()).equals(courseId)
    );

    console.log("🔁 Already assigned?", alreadyAssigned);

    if (!alreadyAssigned) {
      teacher.enrolledCourses.push(courseId);
      const result = await teacher.save();
      console.log("✅ Save success. Updated enrolledCourses:", result.enrolledCourses);
    } else {
      console.log("⏭️ Already assigned. Skipping update.");
    }

    res.status(200).json({ message: 'Teacher assigned to course successfully' });
  } catch (error: any) {
    console.error("🔥 Exception caught in assignTeacherToCourse:");
    console.error(error.name, error.message, error.stack);

    res.status(500).json({ error: 'Failed to update teacher', details: error.message });
  }
};

export const getAllTeachers = async (_req: Request, res: Response) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .populate('enrolledCourses', 'name code');
    res.status(200).json(teachers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    console.log("Deleting teacher with email:", email);
    
    const deleted = await User.findOneAndDelete({ email, role: 'teacher' });

    if (!deleted) return res.status(404).json({ error: 'Teacher not found' });
    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
};

export const unassignTeacherFromCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, courseCode } = req.body;

    const teacher = await User.findOne({ email, role: 'teacher' });
    if (!teacher) {
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }

    const course = await Course.findOne({ code: courseCode });
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    const courseId = new mongoose.Types.ObjectId((course._id as string).toString());

    teacher.enrolledCourses = teacher.enrolledCourses.filter(
      (id) => !new mongoose.Types.ObjectId(id).equals(courseId)
    );

    await teacher.save();
    res.status(200).json({ message: 'Course unassigned from teacher successfully' });
  } catch (error: any) {
    console.error("🔥 Exception in unassignTeacherFromCourse:", error);
    res.status(500).json({ error: 'Failed to unassign course from teacher', details: error.message });
  }
};

// New function to get students enrolled in teacher's courses
export const getEnrolledStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, batchId } = req.query;

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

    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled students' });
  }
};

// Function to enroll students to a batch
export const enrollStudentsToBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId, students } = req.body;

    if (!batchId || !students || !Array.isArray(students)) {
      res.status(400).json({ error: 'Batch ID and students array are required' });
      return;
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    // Find or create users for the students
    const enrolledStudentIds: mongoose.Types.ObjectId[] = [];
    
    for (const studentData of students) {
      const { name, email } = studentData;
      
      let student = await User.findOne({ email });
      
      if (!student) {
        // Create new student user with default password
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        student = await User.create({
          name,
          email,
          password: hashedPassword,
          role: 'student',
          enrolledCourses: [batch.course]
        });
      } else {
        // Add course to existing student if not already enrolled
        if (!student.enrolledCourses.includes(batch.course)) {
          student.enrolledCourses.push(batch.course);
          await student.save();
        }
      }
      
      enrolledStudentIds.push(student._id as mongoose.Types.ObjectId);
    }

    // Fixed: proper ObjectId handling for batch students
    const existingStudentIds = batch.students.map((id: mongoose.Types.ObjectId) => id.toString());
    const newStudentIds = enrolledStudentIds.filter((id: mongoose.Types.ObjectId) => 
      !existingStudentIds.includes(id.toString())
    );
    
    batch.students.push(...newStudentIds);
    await batch.save();

    res.status(200).json({ 
      message: 'Students enrolled successfully',
      enrolledCount: newStudentIds.length,
      totalStudents: batch.students.length
    });
  } catch (error) {
    console.error('Error enrolling students:', error);
    res.status(500).json({ error: 'Failed to enroll students' });
  }
};