const router  = require("express").Router();
const multer  = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const { queryController: c } = require("../controllers/session.controller");

const uploadMedia  = multer({ dest: "uploads/queries/",       limits: { fileSize: 50 * 1024 * 1024 } });
const uploadAnswer = multer({ dest: "uploads/query-answers/", limits: { fileSize: 20 * 1024 * 1024 } });

// Student
router.post("/",                  authenticate, authorize("STUDENT"), uploadMedia.single("media"), c.createQuery);
router.get("/mine",               authenticate, authorize("STUDENT"), c.getMyQueries);
router.patch("/:id/resolve",      authenticate, authorize("STUDENT"), c.resolveQuery);
router.patch("/:id/remind",       authenticate, authorize("STUDENT"), c.remindTutor);
router.patch("/:id/reactivate",   authenticate, authorize("STUDENT"), c.reactivateQuery);

// Tutor / Admin
router.get("/batch/:batchId",     authenticate, authorize("TUTOR", "ADMIN"), c.getBatchQueries);
router.patch("/:id/answer",       authenticate, authorize("TUTOR", "ADMIN"), uploadAnswer.single("attachment"), c.answerQuery);

module.exports = router;