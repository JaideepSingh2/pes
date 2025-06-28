import React, { useState, useEffect } from "react";
import type { JSX } from "react";
import {
  FiMenu,
  FiLogOut,
  FiHome,
  FiBook,
  FiUsers,
  FiEdit,
  FiShield,
  FiDownload,
  FiUserPlus,
  FiUserCheck,
  FiSend,
  FiTrash2,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// Assuming VITE_BACKEND_PORT is correctly configured in your .env file
const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

// Custom "Pinkish, Lilac, Purple & Yellow" Palette - Revised Mix (Light Mode)
const lightPalette = {
  "bg-primary": "#FFFBF6", // Very Light Creamy Yellow (dominant background)
  "bg-secondary": "#FFFAF2", // Slightly darker creamy yellow (for card/section backgrounds)
  "accent-bright-yellow": "#FFD700", // Bright Gold/Yellow (main energetic accent)
  "accent-light-yellow": "#FFECB3", // Lighter Yellow (for subtle use)
  "accent-pink": "#FF8DA1", // Primary Pink Accent
  "accent-lilac": "#C8A2C8", // Soft Lilac (modern cool accent)
  "accent-purple": "#800080", // Deep Purple (primary purple accent)
  "accent-light-purple": "#DDA0DD", // Medium Lilac/Purple (for subtle use)
  "sidebar-bg": "#E6E6FA", // Lavender Blush (sidebar background)
  "text-dark": "#4B0082", // Indigo (Very Dark Purple for primary text on light backgrounds)
  "text-muted": "#A9A9A9", // Dark Gray (Medium Gray for secondary text/borders)
  "text-sidebar-dark": "#4B0082", // Dark text for sidebar for contrast on light lavender
  "border-soft": "#F0E6EF", // Very Light Pinkish-Purple for subtle borders
  "shadow-light": "rgba(128, 0, 128, 0.04)", // Very light, subtle purple shadows
  "shadow-medium": "rgba(128, 0, 128, 0.08)", // Medium subtle purple shadows
  "shadow-strong": "rgba(128, 0, 128, 0.15)", // Stronger subtle purple shadows
  white: "#FFFFFF", // Add white for button text
  "success-green": "#6ddf99", // Added for success messages/icons
  "success-text": "#235d3a", // Added for success text color
};

// **FINAL CORRECTION: UPDATED DARK PALETTE for distinct blue shades**
const darkPalette = {
  "bg-primary": "#212A3E", // Deep Blue-Gray for main background (distinctly blue)
  "bg-secondary": "#394867", // Slightly lighter blue-gray for cards/sections
  "accent-bright-yellow": "#FFEB3B", // Keep accents vibrant
  "accent-light-yellow": "#FFEE58",
  "accent-pink": "#EC407A",
  "accent-lilac": "#BB86FC", // More vibrant lilac for dark mode
  "accent-purple": "#9C27B0", // Deeper purple
  "accent-light-purple": "#CE93D8",
  "sidebar-bg": "#19202D", // Even darker, slightly desaturated blue for sidebar
  "text-dark": "#E0E0E0", // Light grey for primary text
  "text-muted": "#A0A0A0", // Medium grey for secondary text/borders
  "text-sidebar-dark": "#FFFFFF", // White text for dark sidebar for contrast
  "border-soft": "#4A5568", // Darker subtle borders
  "shadow-light": "rgba(0, 0, 0, 0.3)",
  "shadow-medium": "rgba(0, 0, 0, 0.5)",
  "shadow-strong": "rgba(0, 0, 0, 0.7)",
  white: "#FFFFFF", // Keep white for button text
  "success-green": "#4CAF50",
  "success-text": "#C8E6C9", // Lighter green for success text on dark background
};

type Palette = typeof lightPalette;

const getColors = (isDarkMode: boolean): Palette =>
  isDarkMode ? darkPalette : lightPalette;

interface ExamRecord {
   _id: string;
  title: string;
  course: string;
  batch: string;
  startTime: string;
  endTime: string;
  numQuestions: number;
  duration: string;
  totalMarks: number;
  k: number;
  totalStudents: number;
  solutions: string;
}

type CourseBatchItem = {
  courseId: string;
  courseName: string;
  batchId: string;
  batchName: string;
};

const AnimatedCount = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0); // Changed to useState for display
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    let increment = end > start ? 1 : -1;
    let stepTime = 20;
    const timer = setInterval(() => {
      start += increment;
      setDisplay(start);
      if (start === end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
};

const TeacherDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const token = localStorage.getItem("token");

  const [darkMode, setDarkMode] = useState(false); // Dark mode state
  const currentPalette = getColors(darkMode); // Get current palette based on dark mode state

  const [counts, setCounts] = useState({ courses: 0, batches: 0, exams: 0 });
  const [courseBatchList, setCourseBatchList] = useState<CourseBatchItem[]>([]);
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "",
  });

  const [activePage, setActivePage] = useState("home");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExamMsg, setShowExamMsg] = useState(false);
  const [showRoleMsg, setShowRoleMsg] = useState(false);
  const [allUsers, setAllUsers] = useState<
    { role: string; email: string; name: string }[]
  >([]);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [roleEmail, setRoleEmail] = useState("");
  const [roleType, setRoleType] = useState("Student");
  const [logoutDialog, setLogoutDialog] = useState(false);

  const [examTitle, setExamTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [numQuestions, setNumQuestions] = useState(0);
  const [k, setK] = useState(0);
  const [solutions, setSolutions] = useState<File | null>(null);

  // Exam extra modals
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [solutionModalFile, setSolutionModalFile] = useState("");
  const [showSendDialog, setShowSendDialog] = useState(false);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCourse, setEnrollCourse] = useState("");
  const [enrollBatch, setEnrollBatch] = useState("");
  const [enrolledStudents, setEnrolledStudents] = useState<
    Record<string, { name: string; email: string }[]>
  >({});
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvStudents, setCsvStudents] = useState<
    { name: string; email: string }[]
  >([]);
  const [enrollError, setEnrollError] = useState("");

  // Apply or remove 'dark' class from the document HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const ProfileSVG = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: currentPalette["text-dark"] }}
    >
      <path d="M18 20a6 6 0 0 0-12 0" />
      <circle cx="12" cy="10" r="4" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );

  // Common Tailwind classes for cards and buttons based on the new palette
  const commonCardClasses = `
    rounded-xl p-6 space-y-4 border transition-all duration-300
    hover:shadow-xl transform hover:translate-y-[-4px]
  `;

  const commonButtonClasses = `
    px-6 py-2 rounded-lg hover:opacity-90 transition-all duration-200 shadow-md active:scale-95 transform
    focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2
  `;
  const getButtonStyles = (
    colorKey: keyof Palette,
    textColorKey: keyof Palette = "text-dark"
  ): React.CSSProperties & { "--tw-ring-color"?: string } => ({
    backgroundColor: currentPalette[colorKey],
    color: currentPalette[textColorKey], // This is the primary text color control
    boxShadow: `0 4px 15px ${currentPalette[colorKey]}40`,
    "--tw-ring-color": currentPalette[colorKey] + "50", // For focus ring
  });

  const DialogBox = ({
    show,
    message,
    children,
  }: {
    show: boolean;
    message: string;
    children?: React.ReactNode;
  }) => {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-lg p-6 w-80 text-center shadow-2xl"
              style={{
                backgroundColor: currentPalette["bg-primary"],
                boxShadow: `0 8px 25px ${currentPalette["shadow-strong"]}`,
              }}
            >
              <div className="mb-2 flex justify-center">
                {" "}
                {/* Centered SVG */}
                <svg width={56} height={56} fill="none" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r="28"
                    fill={currentPalette["success-green"]}
                  />
                  <path
                    d="M18 30l7 7 13-13"
                    stroke={currentPalette["white"]}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                className="text-lg font-semibold text-center mb-1 mt-2"
                style={{ color: currentPalette["success-text"] }}
              >
                {message}
              </div>
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  useEffect(() => {
    fetch(`http://localhost:${PORT}/api/dashboard/counts`)
      .then((res) => res.json())
      .then((data) => {
        setCounts({
          courses: data.courses,
          batches: data.batches,
          exams: data.exams,
        });
      })
      .catch((err) => console.error("Failed to fetch dashboard counts:", err));
  }, []);

  useEffect(() => {
    fetch(`http://localhost:${PORT}/api/dashboard/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data: { name: string; email: string; role: string }) => {
        setProfileData(data);
      })
      .catch((err) => {
        console.error("Failed to fetch profile:", err);
      });
  }, []);

  useEffect(() => {
    fetch(`http://localhost:${PORT}/api/teacher/teacher-courses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setCourseBatchList(data);
      })
      .catch((err) => {
        console.error("Failed to fetch teacher courses:", err);
      });
  }, []);

  useEffect(() => {
    fetch(`http://localhost:${PORT}/api/teacher/teacher-courses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setCourses(
          data.map((d: any) => ({ id: d.courseId, name: d.courseName }))
        );
        setBatches(
          data.map((d: any) => ({ id: d.batchId, name: d.batchName }))
        );
      });
  }, []);

  const fetchExamRecords = () => {
    fetch(`http://localhost:${PORT}/api/teacher/exams`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setExamRecords(data));
  };

  useEffect(() => {
    fetchExamRecords();
  }, []);

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "0 mins";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} mins`;
  };

  const handleExamSchedule = () => {
    fetch(`http://localhost:${PORT}/api/teacher/schedule-exam`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        courseId: selectedCourse,
        batchId: selectedBatch,
        title: examTitle,
        startTime,
        endTime,
        numQuestions,
        k,
        solutions: solutions?.name || "",
        duration: calculateDuration(startTime, endTime),
        totalMarks: numQuestions * 10,
        totalStudents: 0,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setSelectedCourse("");
        setSelectedBatch("");
        setExamTitle("");
        setStartTime("");
        setEndTime("");
        setNumQuestions(0);
        setK(0);
        setSolutions(null);
        setShowExamMsg(true);
        setTimeout(() => setShowExamMsg(false), 1200);
        fetchExamRecords();
      });
  };

  const handleEnrollStudent = (course: string, batch: string) => {
    setEnrollCourse(course);
    setEnrollBatch(batch);
    setCsvFileName("");
    setEnrollError("");
    setCsvStudents([]);
    setShowEnrollModal(true);
  };

  // In TeacherDashboard.tsx, replace the handleEnrollSubmit function:

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (csvStudents.length === 0) {
      setEnrollError("Please upload a CSV file.");
      return;
    }

    try {
      setEnrollError("");

      // Find the batch ID for the selected course/batch combination
      const selectedCourseBatch = courseBatchList.find(
        (cb) => cb.courseName === enrollCourse
      );

      if (!selectedCourseBatch) {
        setEnrollError("Course/Batch not found");
        return;
      }

      // Create FormData to send CSV file
      const formData = new FormData();
      formData.append("batchId", selectedCourseBatch.batchId);

      // Create a new File object from csvStudents data
      const csvContent =
        "Name,Email\n" +
        csvStudents.map((s) => `"${s.name}","${s.email}"`).join("\n");
      const csvBlob = new Blob([csvContent], { type: "text/csv" });
      const csvFile = new File([csvBlob], csvFileName || "students.csv", {
        type: "text/csv",
      });
      formData.append("csvFile", csvFile);

      const response = await fetch(
        `http://localhost:${PORT}/api/teacher/enroll-students`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Students enrolled:", result);
        setEnrollSuccess(true);

        // Update local state to show enrolled students
        const key = `${enrollCourse}_${enrollBatch}`;
        setEnrolledStudents((prev) => ({
          ...prev,
          [key]: [
            ...(prev[key] || []),
            ...csvStudents.filter(
              (s) =>
                !(prev[key] || []).some(
                  (ex) => ex.email.toLowerCase() === s.email.toLowerCase()
                )
            ),
          ],
        }));

        setTimeout(() => {
          setShowEnrollModal(false);
          setEnrollSuccess(false);
          setCsvStudents([]);
          setCsvFileName("");
          setEnrollError("");
        }, 1500);
      } else {
        setEnrollError(result.error || "Failed to enroll students");
      }
    } catch (error) {
      console.error("Error enrolling students:", error);
      setEnrollError("Failed to enroll students. Please try again.");
    }
  };

  // Function to download enrolled students as CSV
  const downloadCSV = (course: string, batch: string) => {
    const key = `${course}_${batch}`;
    const students = enrolledStudents[key] || [];
    let csv = "Name,Email,Course,Batch\n";

    students.forEach((s) => {
      csv += `${s.name},${s.email},${course},${batch}\n`;
    });

    if (students.length === 0) {
      alert("No students enrolled in this course/batch");
      return;
    }

    // Create a download link
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course}_${batch}_students.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add these functions to your TeacherDashboard component

  // Function to handle solution uploads
  const handleSolutionUpload = async (examId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("solutionPdf", file);

      const response = await fetch(
        `http://localhost:${PORT}/api/teacher/upload-solution/${examId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload solution");
      }

      alert("Solution uploaded successfully");
      fetchExamRecords(); // Refresh the exams list
    } catch (error) {
      console.error("Error uploading solution:", error);
      alert("Failed to upload solution file");
    }
  };

  const viewSolution = async (examId: string) => {
  try {
    // First fetch the PDF data with the proper authorization
    const response = await fetch(
      `http://localhost:${PORT}/api/teacher/solution/${examId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch solution");
    }
    
    // Get the PDF as a blob
    const pdfBlob = await response.blob();
    
    // Create a URL for the blob
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Open the URL in a new tab
    window.open(pdfUrl, "_blank");
    
    // Clean up the URL object after a delay
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000);
  } catch (error) {
    console.error("Error viewing solution:", error);
    alert("Failed to view solution file");
  }
};

  // Function to send exams for evaluation
  const sendForEvaluation = async (examId: string) => {
    try {
      const response = await fetch(
        `http://localhost:${PORT}/api/teacher/send-solutions/${examId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send for evaluation");
      }

      setShowSendDialog(true);
      setTimeout(() => setShowSendDialog(false), 1500);
      fetchExamRecords(); // Refresh the exams list
    } catch (error: any) {
      console.error("Error sending for evaluation:", error);
      alert(error.message || "Failed to send for evaluation");
    }
  };

  // Function to delete exam
  const deleteExam = async (examId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this exam? This will also delete all submissions and evaluations."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:${PORT}/api/teacher/exam/${examId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete exam");
      }

      alert("Exam deleted successfully");
      fetchExamRecords(); // Refresh the exams list
    } catch (error) {
      console.error("Error deleting exam:", error);
      alert("Failed to delete exam");
    }
  };

  // Function to handle edit exam
  const [editingExam, setEditingExam] = useState<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    numQuestions: number;
    k: number;
  } | null>(null);

  const openEditExamModal = (exam: any) => {
    // Convert date strings to input format (YYYY-MM-DDThh:mm)
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 16);
    };

    setEditingExam({
      id: exam._id,
      title: exam.title,
      startTime: formatDate(exam.startTime),
      endTime: formatDate(exam.endTime),
      numQuestions: exam.numQuestions,
      k: exam.k,
    });
  };

  const submitEditExam = async () => {
    if (!editingExam) return;

    try {
      const response = await fetch(
        `http://localhost:${PORT}/api/teacher/exam/${editingExam.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editingExam.title,
            startTime: editingExam.startTime,
            endTime: editingExam.endTime,
            numQuestions: editingExam.numQuestions,
            k: editingExam.k,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update exam");
      }

      setEditingExam(null);
      fetchExamRecords(); // Refresh the exams list
    } catch (error) {
      console.error("Error updating exam:", error);
      alert("Failed to update exam");
    }
  };

  // Function to fetch enrolled students for a course/batch
  const fetchEnrolledStudents = async (courseId: string, batchId: string) => {
    try {
      const response = await fetch(
        `http://localhost:${PORT}/api/teacher/enrolled-students?courseId=${courseId}&batchId=${batchId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }

      const students = await response.json();
      const key = `${courseId}_${batchId}`;
      setEnrolledStudents((prev) => ({ ...prev, [key]: students }));

      return students;
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
      return [];
    }
  };

  // Call this before attempting to download CSV
  // Fix for the handleDownloadCSV function
  const handleDownloadCSV = async (courseId: string, batchId: string) => {
    try {
      // First check if there are students
      const students = await fetchEnrolledStudents(courseId, batchId);
      if (!students || students.length === 0) {
        alert("No students to download");
        return;
      }

      // Create a direct download URL with query parameters
      const downloadUrl = `http://localhost:${PORT}/api/teacher/download-students-csv?courseId=${courseId}&batchId=${batchId}`;

      // Make the fetch request
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download CSV");
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "students.csv";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      alert("Failed to download student data");
    }
  };

  const fetchAllUsers = () => {
    fetch(`http://localhost:${PORT}/api/teacher/users`)
      .then((res) => res.json())
      .then((data) => {
        setAllUsers(data);
      })
      .catch((err) => console.error("Failed to fetch users:", err));
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleRoleUpdate = () => {
    fetch(`http://localhost:${PORT}/api/teacher/update-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: roleEmail, role: roleType }),
    }).then(() => {
      setShowRoleMsg(true);
      setTimeout(() => setShowRoleMsg(false), 1200);
      fetchAllUsers();
      setRoleEmail("");
      setRoleType("student");
    });
  };

  const pages: Record<string, JSX.Element> = {
    home: (
      <motion.div
        className="flex flex-col items-center justify-start w-full h-full pt-10 pb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <h1
          className="text-4xl font-extrabold mb-4 text-center drop-shadow"
          style={{ color: currentPalette["text-dark"] }}
        >
          Welcome, Teacher!
        </h1>
        <p
          className="text-base whitespace-nowrap"
          style={{ color: currentPalette["text-muted"] }}
        >
          Make teaching easier – manage your courses, batches, and exams from
          one place.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 mt-10 w-full max-w-5xl">
          {[
            {
              icon: FiBook,
              label: "Courses",
              count: counts.courses,
              bgColor: currentPalette["sidebar-bg"],
            },
            {
              icon: FiUsers,
              label: "Batches",
              count: counts.batches,
              bgColor: currentPalette["sidebar-bg"],
            },
            {
              icon: FiEdit,
              label: "Exams",
              count: counts.exams,
              bgColor: currentPalette["sidebar-bg"],
            },
          ].map((c) => (
            <div
              key={c.label}
              className={`${commonCardClasses} p-8 rounded-3xl text-white flex flex-col justify-center items-center h-48 relative`}
              style={{
                backgroundColor: c.bgColor,
                boxShadow: `0 8px 20px ${currentPalette["shadow-medium"]}`,
                borderColor: currentPalette["border-soft"],
                color: currentPalette["text-sidebar-dark"],
              }}
            >
              <span
                className="absolute top-4 right-4 rounded-full p-1"
                style={{ backgroundColor: currentPalette["white"] + "20" }}
              >
                <c.icon className="text-4xl drop-shadow-lg" />
              </span>
              <h3 className="text-xl font-bold mt-6 mb-1">{c.label}</h3>
              <p className="text-5xl font-extrabold tracking-wider drop-shadow-lg">
                <AnimatedCount value={c.count} />
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col md:flex-row justify-center gap-8 w-full max-w-2xl">
          <motion.button
            onClick={() => setActivePage("roleManager")}
            className={`${commonButtonClasses} text-lg font-semibold tracking-wide`}
            style={getButtonStyles("sidebar-bg", "text-sidebar-dark")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <FiShield className="text-2xl" />
            Manage Roles
          </motion.button>
          <motion.button
            onClick={() => setActivePage("courses")}
            className={`${commonButtonClasses} text-lg font-semibold tracking-wide`}
            style={getButtonStyles("sidebar-bg", "text-sidebar-dark")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <FiBook className="text-2xl" />
            Manage Courses
          </motion.button>
          <motion.button
            onClick={() => setActivePage("exams")}
            className={`${commonButtonClasses} text-lg font-semibold tracking-wide`}
            style={getButtonStyles("sidebar-bg", "text-sidebar-dark")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <FiEdit className="text-2xl" />
            Schedule Exams
          </motion.button>
        </div>
      </motion.div>
    ),
    roleManager: (
      <motion.div
        className="flex flex-col items-center justify-center w-full h-full pt-10 pb-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className={`shadow-2xl rounded-3xl border px-10 py-12 max-w-lg w-full flex flex-col items-center relative`}
          style={{
            backgroundColor: currentPalette["bg-secondary"],
            borderColor: currentPalette["border-soft"],
            boxShadow: `0 8px 25px ${currentPalette["shadow-medium"]}`,
          }}
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex justify-center">
            <div
              className="p-4 rounded-full shadow-lg"
              style={{ backgroundColor: currentPalette["sidebar-bg"] }}
            >
              {/* Corrected: Use text-sidebar-dark for the icon color, which will be white in dark mode and dark in light mode */}
              <FiUserCheck
                className="text-4xl"
                style={{ color: currentPalette["text-sidebar-dark"] }}
              />
            </div>
          </div>
          <h2
            className="text-3xl font-extrabold mb-2 text-center drop-shadow mt-6"
            style={{ color: currentPalette["text-dark"] }}
          >
            Role Manager
          </h2>
          <p
            className="mb-8 text-center text-base font-medium"
            style={{ color: currentPalette["text-muted"] }}
          >
            Assign and update user roles efficiently.
          </p>
          <form
            name="roleUpdateForm"
            id="roleUpdateForm"
            className="flex flex-col gap-8 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              handleRoleUpdate();
            }}
          >
            <div className="flex flex-col gap-2 w-full">
              <label
                className="font-semibold"
                style={{ color: currentPalette["text-dark"] }}
              >
                Select User
              </label>
              <select
                name="selectUser"
                id="selectUser"
                value={roleEmail}
                onChange={(e) => setRoleEmail(e.target.value)}
                className="border-2 px-4 py-3 rounded-xl w-full shadow-md transition"
                style={{
                  borderColor: currentPalette["border-soft"],
                  backgroundColor: currentPalette["white"],
                  color: currentPalette["text-dark"],
                  outlineColor: currentPalette["sidebar-bg"],
                }}
                required
              >
                <option value="">Select User</option>
                <optgroup
                  label="Teaching Assistants (TAs)"
                  style={{ color: currentPalette["text-dark"] }}
                >
                  {allUsers
                    .filter((user) => user.role === "ta")
                    .map((user) => (
                      <option key={user.email} value={user.email}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </optgroup>
                <optgroup
                  label="Students"
                  style={{ color: currentPalette["text-dark"] }}
                >
                  {allUsers
                    .filter((user) => user.role === "student")
                    .map((user) => (
                      <option key={user.email} value={user.email}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label
                className="font-semibold"
                style={{ color: currentPalette["text-dark"] }}
              >
                Select Role
              </label>
              <select
                name="selectRole"
                id="selectRole"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
                className="border-2 px-4 py-3 rounded-xl w-full shadow-md transition"
                style={{
                  borderColor: currentPalette["border-soft"],
                  backgroundColor: currentPalette["white"],
                  color: currentPalette["text-dark"],
                  outlineColor: currentPalette["sidebar-bg"],
                }}
                required
              >
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="ta">Teaching Assistant (TA)</option>
              </select>
            </div>
            <motion.button
              type="submit"
              className={`${commonButtonClasses} text-lg tracking-wide`}
              style={getButtonStyles("sidebar-bg", "text-sidebar-dark")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              Update Role
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    ),
    courses: (
      <motion.div
        className="flex flex-col items-center justify-start w-full h-full pt-10 pb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <h2
          className="text-3xl font-extrabold mb-10 text-center drop-shadow"
          style={{ color: currentPalette["text-dark"] }}
        >
          Courses and Batches
        </h2>
        <div className="w-full max-w-5xl">
          <table
            className="w-full border-separate"
            style={{ borderSpacing: "0 16px" }}
          >
            <thead>
              <tr>
                <th
                  className="py-4 px-6 rounded-l-2xl text-lg font-semibold text-center tracking-wide"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Course Name
                </th>
                <th
                  className="py-4 px-6 text-lg font-semibold text-center tracking-wide"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Batch Name
                </th>
                <th
                  className="py-4 px-6 rounded-r-2xl text-lg font-semibold text-center tracking-wide"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {courseBatchList.length > 0 ? (
                courseBatchList.map((row, idx) => (
                  <tr
                    key={idx}
                    className="transition"
                    style={{
                      backgroundColor: currentPalette["bg-secondary"],
                      boxShadow: `0 2px 10px ${currentPalette["shadow-light"]}`,
                      color: currentPalette["text-dark"],
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        currentPalette["accent-light-purple"] + "20")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        currentPalette["bg-secondary"])
                    }
                  >
                    <td className="px-6 py-4 text-center text-base font-medium rounded-l-xl">
                      {row.courseName}
                    </td>
                    <td className="px-6 py-4 text-center text-base font-medium">
                      {row.batchName}
                    </td>
                    <td className="px-6 py-4 text-center text-base flex gap-2 justify-center rounded-r-xl">
                      <motion.button
                        onClick={() =>
                          handleEnrollStudent(row.courseName, row.batchName)
                        }
                        className={`${commonButtonClasses} px-4 py-2 font-semibold`}
                        style={getButtonStyles(
                          "accent-bright-yellow",
                          "text-dark"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                      >
                        <FiUserPlus className="text-lg" /> Enroll Student
                      </motion.button>
                      <motion.button
                        onClick={() =>
                          handleDownloadCSV(row.courseId, row.batchId)
                        } // Change from courseName/batchName to courseId/batchId
                        className={`${commonButtonClasses} px-4 py-2 font-semibold`}
                        style={getButtonStyles("accent-lilac", "white")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                      >
                        <FiDownload className="text-lg" /> Download CSV
                      </motion.button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center py-12 text-lg font-semibold"
                    style={{ color: currentPalette["text-muted"] }}
                  >
                    No courses and batches added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    ),
    exams: (
      <motion.div
        className="flex flex-col items-center w-full h-full pt-10 pb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <h2
          className="text-3xl font-bold mb-8 text-center"
          style={{ color: currentPalette["text-dark"] }}
        >
          Exam Management
        </h2>
        <div className="flex flex-wrap gap-8 items-center mb-8 justify-center">
          <label
            className="font-semibold"
            style={{ color: currentPalette["text-dark"] }}
          >
            Course
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedBatch("");
            }}
            className="border rounded px-4 py-2 min-w-[180px]"
            style={{
              borderColor: currentPalette["border-soft"],
              backgroundColor: currentPalette["bg-secondary"],
              color: currentPalette["text-dark"],
              outlineColor: currentPalette["sidebar-bg"],
            }}
          >
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label
            className="font-semibold"
            style={{ color: currentPalette["text-dark"] }}
          >
            Batch
          </label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="border rounded px-4 py-2 min-w-[120px]"
            style={{
              borderColor: currentPalette["border-soft"],
              backgroundColor: currentPalette["bg-secondary"],
              color: currentPalette["text-dark"],
              outlineColor: currentPalette["sidebar-bg"],
            }}
            disabled={!selectedCourse}
          >
            <option value="">Select Batch</option>
            {batches
              .filter((b) => b && b.id)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
          <motion.button
            className={`${commonButtonClasses} text-lg font-semibold`}
            style={getButtonStyles("sidebar-bg", "text-sidebar-dark")}
            disabled={!selectedCourse || !selectedBatch}
            onClick={() => setShowExamModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            Schedule Exam
          </motion.button>
        </div>
        <div className="w-full max-w-5xl">
          <table
            className="w-full border-separate"
            style={{ borderSpacing: "0 8px" }}
          >
            <thead>
              <tr>
                <th
                  className="py-3 px-3 rounded-l-2xl text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Exam Name
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Batch
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Date
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Time
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  No. of Questions
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Duration
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Total Marks
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  K
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Total Students
                </th>
                <th
                  className="py-3 px-3 text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Solutions
                </th>
                <th
                  className="py-3 px-3 rounded-r-2xl text-base"
                  style={{
                    backgroundColor: currentPalette["sidebar-bg"],
                    color: currentPalette["text-sidebar-dark"],
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {examRecords.length > 0 ? (
                examRecords.map((ex, i) => {
                  const dateObj = new Date(ex.startTime);
                  const date = dateObj.toLocaleDateString("en-GB");
                  const time = dateObj.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr
                      key={i}
                      className="transition"
                      style={{
                        backgroundColor: currentPalette["bg-secondary"],
                        boxShadow: `0 2px 10px ${currentPalette["shadow-light"]}`,
                        color: currentPalette["text-dark"],
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          currentPalette["accent-light-purple"] + "20")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          currentPalette["bg-secondary"])
                      }
                    >
                      <td className="px-3 py-2 text-center rounded-l-xl">
                        {ex.title}
                      </td>
                      <td className="px-3 py-2 text-center">{ex.batch}</td>
                      <td className="px-3 py-2 text-center">{date}</td>
                      <td className="px-3 py-2 text-center">{time}</td>
                      <td className="px-3 py-2 text-center">
                        {ex.numQuestions}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {ex.duration || "-"}
                      </td>
                      <td className="px-3 py-2 text-center">{ex.totalMarks}</td>
                      <td className="px-3 py-2 text-center">{ex.k}</td>
                      <td className="px-3 py-2 text-center">
                        {ex.totalStudents}
                      </td>
                      <td className="px-3 py-2 text-center">
  {/* Solution file upload and view button */}
  <div className="flex flex-col gap-2 items-center">
    <input 
      type="file" 
      id={`solution-${ex._id}`}
      accept=".pdf"
      style={{ display: 'none' }} 
      onChange={(e) => {
        if (e.target.files && e.target.files[0]) {
          handleSolutionUpload(ex._id, e.target.files[0]);
        }
      }}
    />
    <label 
      htmlFor={`solution-${ex._id}`}
      className="cursor-pointer text-xs px-2 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600"
    >
      Upload
    </label>
    <motion.button
      onClick={() => viewSolution(ex._id)}
      className="text-xs px-2 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
    >
      View
    </motion.button>
  </div>
</td>
<td className="px-3 py-2 flex gap-4 justify-center rounded-r-xl">
  <motion.button
    onClick={() => openEditExamModal(ex)}
    title="Edit Exam"
    className="text-2xl"
    style={{ color: currentPalette["accent-bright-yellow"] }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
  >
    <FiEdit />
  </motion.button>
  <motion.button
    onClick={() => sendForEvaluation(ex._id)}
    title="Send for Evaluation"
    className="text-2xl"
    style={{ color: currentPalette["sidebar-bg"] }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
  >
    <FiSend />
  </motion.button>
  <motion.button
    onClick={() => deleteExam(ex._id)}
    title="Delete Exam"
    className="text-2xl"
    style={{ color: currentPalette["accent-pink"] }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
  >
    <FiTrash2 />
  </motion.button>
</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-8"
                    style={{ color: currentPalette["text-muted"] }}
                  >
                    No exams scheduled yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AnimatePresence>
          {showExamModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            >
              <motion.form
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="rounded-2xl shadow-xl px-8 py-8 flex flex-col gap-4 w-[400px] max-w-full"
                style={{
                  backgroundColor: currentPalette["bg-primary"],
                  color: currentPalette["text-dark"],
                }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    !examTitle ||
                    !selectedCourse ||
                    !selectedBatch ||
                    !startTime ||
                    !endTime ||
                    !numQuestions ||
                    !k
                  ) {
                    alert("Please fill all fields.");
                    return;
                  }
                  await handleExamSchedule();
                  setShowExamModal(false);
                }}
              >
                <h2 className="text-xl font-bold mb-2">Schedule Exam</h2>
                <div>
                  <label className="font-semibold">Name:</label>
                  <input
                    type="text"
                    className="border rounded px-3 py-2 w-full mt-1"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                      outlineColor: currentPalette["sidebar-bg"],
                    }}
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Exam Name"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold">Course:</label>
                  <select
                    className="border rounded px-3 py-2 w-full mt-1"
                    value={selectedCourse}
                    disabled
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                    }}
                  >
                    <option>
                      {courses.find((c) => c.id === selectedCourse)?.name || ""}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold">Batch:</label>
                  <select
                    className="border rounded px-3 py-2 w-full mt-1"
                    value={selectedBatch}
                    disabled
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                    }}
                  >
                    <option>
                      {batches.find((b) => b.id === selectedBatch)?.name || ""}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold">Start Time:</label>
                  <input
                    type="datetime-local"
                    className="border rounded px-3 py-2 w-full mt-1"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                      outlineColor: currentPalette["sidebar-bg"],
                    }}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold">End Time:</label>
                  <input
                    type="datetime-local"
                    className="border rounded px-3 py-2 w-full mt-1"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                      outlineColor: currentPalette["sidebar-bg"],
                    }}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold">Number of Questions:</label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full mt-1"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                      outlineColor: currentPalette["sidebar-bg"],
                    }}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold">No. of Peers (K):</label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full mt-1"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                      outlineColor: currentPalette["sidebar-bg"],
                    }}
                    value={k}
                    onChange={(e) => setK(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold">Solutions:</label>
                  <div className="flex items-center gap-4 mt-1">
                    <input
                      type="file"
                      id="solutions-upload"
                      className="hidden"
                      onChange={(e) =>
                        setSolutions(e.target.files?.[0] || null)
                      }
                    />
                    <label
                      htmlFor="solutions-upload"
                      className={`${commonButtonClasses} px-4 py-2 font-semibold`}
                      style={getButtonStyles("sidebar-bg", "white")}
                    >
                      Choose File
                    </label>
                    <span
                      className="ml-2 text-sm"
                      style={{ color: currentPalette["text-muted"] }}
                    >
                      {solutions ? solutions.name : "No file chosen"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <motion.button
                    type="submit"
                    className={`${commonButtonClasses} px-8 py-2 font-semibold`}
                    style={getButtonStyles("sidebar-bg", "white")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    Submit
                  </motion.button>
                  <motion.button
                    type="button"
                    className={`${commonButtonClasses} px-8 py-2 font-semibold`}
                    style={getButtonStyles("text-muted", "text-dark")}
                    onClick={() => setShowExamModal(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {editingExam && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            >
              <motion.form
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="rounded-2xl shadow-xl px-8 py-8 flex flex-col gap-4 w-[400px] max-w-full"
                style={{
                  backgroundColor: currentPalette["bg-primary"],
                  color: currentPalette["text-dark"],
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitEditExam();
                }}
              >
                <h3
                  className="text-xl font-bold mb-2 text-center"
                  style={{ color: currentPalette["text-dark"] }}
                >
                  Edit Exam
                </h3>

                <div className="flex flex-col gap-2">
                  <label className="font-medium">Exam Title</label>
                  <input
                    type="text"
                    value={editingExam.title}
                    onChange={(e) =>
                      setEditingExam({ ...editingExam, title: e.target.value })
                    }
                    className="border rounded-lg px-3 py-2"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                    }}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-medium">Start Time</label>
                  <input
                    type="datetime-local"
                    value={editingExam.startTime}
                    onChange={(e) =>
                      setEditingExam({
                        ...editingExam,
                        startTime: e.target.value,
                      })
                    }
                    className="border rounded-lg px-3 py-2"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                    }}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-medium">End Time</label>
                  <input
                    type="datetime-local"
                    value={editingExam.endTime}
                    onChange={(e) =>
                      setEditingExam({
                        ...editingExam,
                        endTime: e.target.value,
                      })
                    }
                    className="border rounded-lg px-3 py-2"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                    }}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-medium">Number of Questions</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingExam.numQuestions}
                    onChange={(e) =>
                      setEditingExam({
                        ...editingExam,
                        numQuestions: parseInt(e.target.value),
                      })
                    }
                    className="border rounded-lg px-3 py-2"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                    }}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-medium">
                    Number of Peer Evaluations (K)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingExam.k}
                    onChange={(e) =>
                      setEditingExam({
                        ...editingExam,
                        k: parseInt(e.target.value),
                      })
                    }
                    className="border rounded-lg px-3 py-2"
                    style={{
                      borderColor: currentPalette["border-soft"],
                      backgroundColor: currentPalette["bg-secondary"],
                      color: currentPalette["text-dark"],
                    }}
                    required
                  />
                </div>

                <div className="flex gap-4 justify-end mt-4">
                  <motion.button
                    type="button"
                    onClick={() => setEditingExam(null)}
                    className={commonButtonClasses}
                    style={getButtonStyles("accent-light-purple", "text-dark")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className={commonButtonClasses}
                    style={getButtonStyles("sidebar-bg", "text-sidebar-dark")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Save Changes
                  </motion.button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showSolutionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="rounded-2xl shadow-xl px-12 py-8 flex flex-col items-center min-w-[320px] max-w-full"
                style={{
                  backgroundColor: currentPalette["bg-primary"],
                  color: currentPalette["text-dark"],
                }}
              >
                <h2 className="text-xl font-bold mb-4">Uploaded Solution</h2>
                <div className="mb-6">
                  <span className="text-lg">{solutionModalFile}</span>
                </div>
                <motion.button
                  className={`${commonButtonClasses} px-8 py-2 font-semibold`}
                  style={getButtonStyles("sidebar-bg", "white")}
                  onClick={() => setShowSolutionModal(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <DialogBox
          show={showSendDialog}
          message="Solutions sent to students for evaluation!"
        />
      </motion.div>
    ),
  };

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{
        background: currentPalette["bg-primary"],
      }}
    >
      {/* Subtle background pattern for visual interest, blending with primary background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='${encodeURIComponent(
            currentPalette["text-muted"]
          )}' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M3 0L0 3l3 3 3-3z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "80px 80px",
          background: `linear-gradient(135deg, ${currentPalette["bg-primary"]} 0%, ${currentPalette["bg-primary"]} 50%, ${currentPalette["bg-primary"]} 100%)`,
        }}
      ></div>

      {/* Sidebar */}
      <motion.div
        className={`flex flex-col justify-between py-6 px-4 rounded-r-3xl transition-all duration-300 shadow-xl z-20 overflow-hidden ${
          showSidebar ? "w-64" : "w-20"
        }`}
        style={{
          backgroundColor: currentPalette["sidebar-bg"],
          backgroundImage: `linear-gradient(180deg, ${currentPalette["sidebar-bg"]}, ${currentPalette["sidebar-bg"]}E0)`,
          boxShadow: `8px 0 30px ${currentPalette["shadow-medium"]}`,
        }}
      >
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="self-start mb-6 p-2 border-2 border-transparent rounded-full active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2"
          // Corrected the style application for sidebar toggle button
          style={
            {
              borderColor: currentPalette["accent-lilac"],
              "--tw-ring-color": currentPalette["accent-lilac"] + "70",
            } as React.CSSProperties
          }
        >
          <FiMenu
            className="text-2xl"
            style={{ color: currentPalette["text-sidebar-dark"] }}
          />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <h2
            className={`font-bold mb-10 mt-4 transition-all duration-300 ${
              showSidebar ? "text-2xl" : "text-lg"
            }`}
            style={{ color: currentPalette["text-sidebar-dark"] }}
          >
            {showSidebar ? "Teacher Panel" : "Tea"}
          </h2>
          <ul className="space-y-3 w-full">
            {["home", "roleManager", "courses", "exams"].map((key) => {
              const icons: Record<string, any> = {
                home: FiHome,
                roleManager: FiShield,
                courses: FiBook,
                exams: FiEdit,
              };
              const Icon = icons[key];
              return (
                <motion.li
                  key={key}
                  onClick={() => setActivePage(key)}
                  className={`cursor-pointer flex items-center px-4 py-2 rounded-lg transition-all duration-200 transform
                    ${
                      activePage === key
                        ? "scale-100 relative"
                        : "hover:scale-[1.02]"
                    }
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                  `}
                  style={{
                    color: currentPalette["text-sidebar-dark"],
                  }}
                  whileHover={{
                    scale: 1.03,
                    x: 5,
                    boxShadow: `0 0 10px ${currentPalette["shadow-light"]}`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {activePage === key && (
                    <motion.div
                      layoutId="activePillTeacher" // Unique layoutId for teacher dashboard
                      className="absolute inset-0 rounded-lg -z-10"
                      style={{
                        backgroundColor: currentPalette["sidebar-bg"],
                        boxShadow: `0 0 15px ${currentPalette["sidebar-bg"]}40`,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon
                    className={`transition-all duration-300 ${
                      showSidebar ? "mr-3 text-xl" : "text-3xl"
                    }`}
                  />
                  {showSidebar && (
                    <span className="font-medium whitespace-nowrap">
                      {key === "roleManager"
                        ? "Manage Roles"
                        : key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
        <motion.button
          onClick={() => setLogoutDialog(true)}
          className="flex items-center justify-center gap-2 hover:opacity-80 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 mt-auto"
          style={{ color: currentPalette["text-sidebar-dark"] }}
          whileHover={{ scale: 1.03, x: 5 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiLogOut
            className={`${showSidebar ? "mr-3 text-xl" : "text-3xl"}`}
          />
          {showSidebar && (
            <span className="font-medium whitespace-nowrap">Logout</span>
          )}
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-y-auto flex justify-center items-start p-4 z-10">
        <div className="absolute top-4 right-6 z-20">
          <button
            onClick={() => setShowProfilePopup(!showProfilePopup)}
            className="p-2 flex items-center justify-center rounded-full border-2 border-transparent shadow active:scale-95 transition"
            style={{
              backgroundColor: currentPalette["white"],
              borderColor: currentPalette["border-soft"],
              boxShadow: `0 2px 14px 0 ${currentPalette["shadow-medium"]}`,
            }}
            title="Profile"
          >
            <ProfileSVG />
          </button>
          <AnimatePresence>
            {showProfilePopup && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-80 p-4 rounded-b-3xl shadow-lg z-10"
                style={{
                  backgroundColor: currentPalette["bg-secondary"],
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: 24,
                  borderBottomRightRadius: 24,
                  boxShadow: `0 4px 14px ${currentPalette["shadow-medium"]}`,
                  color: currentPalette["text-dark"],
                }}
              >
                <h2 className="text-xl font-bold mb-4">Profile Info</h2>
                <div className="space-y-2 mb-4">
                  <p>
                    <strong>Name:</strong> {profileData.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {profileData.email}
                  </p>
                  <p>
                    <strong>Role:</strong> {profileData.role}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div
          className="rounded-3xl shadow-2xl w-full max-w-6xl h-auto mt-20 mb-10 mx-6 px-8 py-6 flex flex-col items-start justify-start overflow-auto"
          style={{
            minHeight: "calc(100vh - 120px)",
            backgroundColor: currentPalette["bg-primary"],
            boxShadow: `0 10px 40px ${currentPalette["shadow-medium"]}`,
          }}
        >
          <div className="w-full">{pages[activePage]}</div>
        </div>

        <DialogBox show={showExamMsg} message="Exam Scheduled Successfully!" />
        <DialogBox show={showRoleMsg} message="Role Updated Successfully!" />

        <AnimatePresence>
          {showEnrollModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            >
              <motion.form
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onSubmit={handleEnrollSubmit}
                className="rounded-2xl shadow-xl px-8 py-8 flex flex-col items-center w-[350px] max-w-full"
                style={{
                  backgroundColor: currentPalette["bg-primary"],
                  color: currentPalette["text-dark"],
                }}
              >
                <h2 className="text-2xl font-bold mb-6 text-center">
                  Enroll Student
                </h2>
                <div className="flex flex-col gap-3 w-full">
                  <div>
                    <label className="font-semibold">Course:</label>
                    <input
                      value={enrollCourse}
                      disabled
                      className="border px-3 py-2 rounded w-full mt-1"
                      style={{
                        borderColor: currentPalette["border-soft"],
                        backgroundColor: currentPalette["bg-secondary"],
                        color: currentPalette["text-dark"],
                      }}
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Batch:</label>
                    <input
                      value={enrollBatch}
                      disabled
                      className="border px-3 py-2 rounded w-full mt-1"
                      style={{
                        borderColor: currentPalette["border-soft"],
                        backgroundColor: currentPalette["bg-secondary"],
                        color: currentPalette["text-dark"],
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-center w-full my-2">
                    <label className="font-semibold mb-2 text-center w-full">
                      Bulk Enroll via CSV
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      id="csv-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.name.endsWith(".csv")) {
                          setEnrollError("Please upload a valid CSV file.");
                          setCsvStudents([]);
                          return;
                        }
                        setCsvFileName(file.name);
                        const text = await file.text();
                        const rows = text
                          .split("\n")
                          .map((r) => r.trim())
                          .filter(Boolean);
                        let dataRows = rows;
                        if (
                          rows[0].toLowerCase().includes("name") &&
                          rows[0].toLowerCase().includes("email")
                        ) {
                          dataRows = rows.slice(1);
                        }
                        const unique: Record<string, boolean> = {};
                        const students: { name: string; email: string }[] = [];
                        for (const row of dataRows) {
                          const [name, email] = row
                            .split(",")
                            .map((s) => s?.trim());
                          if (name && email) {
                            const key = (name + email).toLowerCase();
                            if (!unique[key]) {
                              unique[key] = true;
                              students.push({ name, email });
                            }
                          }
                        }
                        setCsvStudents(students);
                        setEnrollError("");
                      }}
                    />
                    <label
                      htmlFor="csv-upload"
                      className={`${commonButtonClasses} w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold`}
                      style={getButtonStyles(
                        "accent-bright-yellow",
                        "text-dark"
                      )}
                    >
                      <FiDownload className="text-lg" /> Choose CSV File
                    </label>
                    <span
                      className="text-xs mt-1"
                      style={{ color: currentPalette["text-muted"] }}
                    >
                      {csvFileName ? csvFileName : "No file chosen"}
                    </span>
                    <span
                      className="text-xs mt-1"
                      style={{ color: currentPalette["text-muted"] }}
                    >
                      Upload a CSV file with columns: Name, Email
                    </span>
                    {enrollError && (
                      <div
                        className="mt-2 font-semibold text-center w-full"
                        style={{ color: currentPalette["accent-pink"] }}
                      >
                        {enrollError}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <motion.button
                    type="submit"
                    className={`${commonButtonClasses} px-8 py-2 font-semibold`}
                    style={getButtonStyles("sidebar-bg", "white")}
                    disabled={csvStudents.length === 0}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    Enroll
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setShowEnrollModal(false);
                      setCsvFileName("");
                      setEnrollError("");
                      setCsvStudents([]);
                    }}
                    className={`${commonButtonClasses} px-8 py-2 font-semibold`}
                    style={getButtonStyles("text-muted", "white")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    Cancel
                  </motion.button>
                </div>
                {enrollSuccess && (
                  <div
                    className="mt-4 font-semibold text-center"
                    style={{ color: currentPalette["success-text"] }}
                  >
                    Student enrolled successfully!
                  </div>
                )}
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {logoutDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="rounded-lg p-6 w-80 text-center shadow-2xl"
                style={{
                  backgroundColor: currentPalette["bg-primary"],
                  boxShadow: `0 8px 25px ${currentPalette["shadow-strong"]}`,
                }}
              >
                <div
                  className="mb-4 text-xl font-bold"
                  style={{ color: currentPalette["text-dark"] }}
                >
                  Confirm Logout
                </div>
                <p
                  className="mb-6"
                  style={{ color: currentPalette["text-muted"] }}
                >
                  Are you sure you want to log out?
                </p>
                <div className="flex justify-center gap-4">
                  <motion.button
                    className={`${commonButtonClasses} px-6 py-2`}
                    style={getButtonStyles("accent-pink", "white")}
                    onClick={() => {
                      setLogoutDialog(false);
                      onLogout?.();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    Logout
                  </motion.button>
                  <motion.button
                    className={`${commonButtonClasses} px-6 py-2`}
                    style={getButtonStyles("text-muted", "text-dark")}
                    onClick={() => setLogoutDialog(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dark Mode Toggle Button */}
        <motion.button
          onClick={toggleDarkMode}
          className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg z-50 transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={
            {
              backgroundColor: currentPalette["sidebar-bg"],
              color: currentPalette["white"],
              boxShadow: `0 4px 15px ${currentPalette["sidebar-bg"]}40`,
              "--tw-ring-color": currentPalette["sidebar-bg"] + "70",
            } as React.CSSProperties
          }
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          {darkMode ? (
            <FiSun className="text-2xl" />
          ) : (
            <FiMoon className="text-2xl" />
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default TeacherDashboard;
