const router = require("express").Router();
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const { queryController: c } = require("../controllers/session.controller");

const upload = multer({ dest: "uploads/queries/", limits: { fileSize: 50 * 1024 * 1024 } });

// Student
router.post("/",             authenticate, authorize("STUDENT"), upload.single("media"), c.createQuery);
router.get("/mine",          authenticate, authorize("STUDENT"), c.getMyQueries);
router.patch("/:id/resolve", authenticate, authorize("STUDENT"), c.resolveQuery);

// Tutor / Admin
router.get("/batch/:batchId", authenticate, authorize("TUTOR", "ADMIN"), c.getBatchQueries);
router.patch("/:id/answer",   authenticate, authorize("TUTOR", "ADMIN"), c.answerQuery);

module.exports = router;
