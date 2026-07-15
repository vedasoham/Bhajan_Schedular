const express = require("express");
const router = express.Router();
const singerController = require("../controllers/singerController");
const {
  requireLogin,
  requireApiLogin
} = require("../middleware/auth");

router.get("/admin/singers", requireLogin, singerController.showSingers);
router.get("/admin/singer-dictionary", requireLogin, singerController.showSingerDictionary);
router.post("/api/admin/add-singer", requireApiLogin, singerController.addSinger);
router.post("/api/admin/edit-singer/:id", requireApiLogin, singerController.editSinger);
router.post("/api/admin/delete-singer/:id", requireApiLogin, singerController.deleteSinger);

module.exports = router;