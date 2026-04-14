const router  = require("express").Router();
const multer  = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const { assignmentController: c } = require("../controllers/session.controller");

const upload = multer({ dest: "uploads/assignments/", limits: { fileSize: 20 * 1024 * 1024 } });

// Tutor
router.post("/",                        authenticate, authorize("TUTOR"),   upload.single("file"), c.createAssignment);
router.get("/tutor/batch/:batchId",     authenticate, authorize("TUTOR"),   c.getTutorBatchAssignments);
router.patch("/submissions/:id/review", authenticate, authorize("TUTOR"),   c.reviewSubmission);

// Student
router.get("/batch/:batchId",           authenticate,                       c.getBatchAssignments);
router.post("/:id/submit",              authenticate, authorize("STUDENT"), upload.single("file"), c.submitAssignment);

module.exports = router;
