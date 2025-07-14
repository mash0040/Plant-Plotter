const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const db = require("../config/db.js");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

// GET /api/gardens
router.get("/", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query("SELECT * FROM gardens WHERE user_id = ?", [
      userId,
    ]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching gardens:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/gardens
router.post("/", verifyToken, async (req, res) => {
  const { name, width, height, unit } = req.body;
  const userId = req.user.id;

  if (!name || !width || !height || !unit) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO gardens (user_id, name, width, height, unit) VALUES (?, ?, ?, ?, ?)",
      [userId, name, width, height, unit]
    );

    res.status(201).json({
      message: "Garden created successfully",
      gardenId: result.insertId,
    });
  } catch (err) {
    console.error("Error creating garden:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/gardens/:id
router.put("/:id", verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;
  const { name, width, height, unit } = req.body;

  if (!name || !width || !height || !unit) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [result] = await db
      .promise()
      .query(
        "UPDATE gardens SET name = ?, width = ?, height = ?, unit = ? WHERE id = ? AND user_id = ?",
        [name, width, height, unit, gardenId, userId]
      );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Garden not found or unauthorized" });
    }

    res.json({ message: "Garden updated successfully" });
  } catch (err) {
    console.error("Error updating garden:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/gardens/:id
router.delete("/:id", verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;

  try {
    const [result] = await db
      .promise()
      .query("DELETE FROM gardens WHERE id = ? AND user_id = ?", [
        gardenId,
        userId,
      ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Garden not found or unauthorized" });
    }

    res.json({ message: "Garden deleted successfully" });
  } catch (err) {
    console.error("Error deleting garden:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/gardens/:id/layout
router.get("/:id/layout", verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;

  try {
    // Get garden metadata
    const [[garden]] = await db.query(
      "SELECT id, width, height, unit FROM gardens WHERE id = ? AND user_id = ?",
      [gardenId, userId]
    );

    if (!garden) {
      return res
        .status(404)
        .json({ message: "Garden not found or unauthorized" });
    }

    // Get all plants for the garden
    const [plants] = await db.query(
      "SELECT id, name, x, y, image_url, spacing, soil_type, note FROM plants WHERE garden_id = ?",
      [gardenId]
    );

    res.json({
      width: garden.width,
      height: garden.height,
      unit: garden.unit,
      plants,
    });
  } catch (err) {
    console.error("Error fetching garden layout:", err);
    res.status(500).json({ message: "Failed to fetch garden layout" });
  }
});

/*
// GET /api/gardens/:id/export
router.get("/:id/export", verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;

  try {
    const [[garden]] = await db.query(
      "SELECT name, width, height, unit FROM gardens WHERE id = ? AND user_id = ?",
      [gardenId, userId]
    );
    if (!garden)
      return res
        .status(404)
        .json({ message: "Garden not found or unauthorized" });

    const [plants] = await db.query(
      "SELECT name, x, y, spacing, soil_type, note, image_url FROM plants WHERE garden_id = ?",
      [gardenId]
    );
    const gardenPlantNames = plants.map((p) => p.name.trim().toLowerCase());

    // Load companion data
    const dataPath = path.join(__dirname, "../data/companion_plants.json");
    const rawData = fs.readFileSync(dataPath);
    const rawCompanion = JSON.parse(rawData);
    const companionData = {};
    for (const key in rawCompanion) {
      companionData[key.trim().toLowerCase()] = rawCompanion[key];
    }

    // Advisory logic
    function singularize(name) {
      const lower = name.trim().toLowerCase();
      if (lower.endsWith("ies")) return lower.slice(0, -3) + "y";
      if (lower.endsWith("s") && !lower.endsWith("ss"))
        return lower.slice(0, -1);
      return lower;
    }

    const tips = new Set();
    const warnings = new Set();

    for (const rawName of gardenPlantNames) {
      const plant = singularize(rawName);
      const entry = companionData[plant];
      if (!entry) continue;

      const allTips = [
        ...(entry.companions || []),
        ...(entry.helps || []),
        ...(entry.helped_by || []),
      ];

      allTips.forEach((t) => {
        const tNorm = singularize(t.trim().toLowerCase());
        if (gardenPlantNames.includes(tNorm)) {
          tips.add(
            `${capitalize(rawName)} grows well with or supports ${capitalize(
              t
            )}.`
          );
        }
      });

      const allWarnings = [
        ...(entry.incompatible || []),
        ...(entry.avoid || []),
        ...(entry.repels || []),
      ];

      allWarnings.forEach((w) => {
        const wNorm = singularize(w.trim().toLowerCase());
        if (gardenPlantNames.includes(wNorm)) {
          warnings.add(
            `${capitalize(rawName)} should not be planted near ${capitalize(
              w
            )}.`
          );
        }
      });
    }

    // Generate PDF
    const doc = new PDFDocument();
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=garden-${gardenId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(18).text(`Garden Report: ${garden.name}`, { underline: true });
    doc.moveDown().fontSize(12);
    doc.text(`Dimensions: ${garden.width} x ${garden.height} ${garden.unit}`);
    doc.moveDown();

    // Plants Section
    doc.fontSize(14).text("Plants in Garden", { underline: true });
    doc.moveDown(0.5);

    if (plants.length === 0) {
      doc.text("No plants added yet.");
    } else {
      plants.forEach((p, i) => {
        doc.fontSize(12).text(`${i + 1}. ${capitalize(p.name)}`);
        doc.fontSize(10).text(`- Position: (${p.x}, ${p.y})`);
        doc.text(`- Soil: ${p.soil_type}, Spacing: ${p.spacing}`);
        doc.text(`- Note: ${p.note || "N/A"}`);
        doc.text(" ");
      });
    }

    // Tips
    doc
      .addPage()
      .fontSize(14)
      .text("Companion Planting Tips", { underline: true });
    doc.moveDown();
    if (tips.size === 0) {
      doc.text("No tips found based on current garden.");
    } else {
      [...tips].forEach((tip, i) => doc.fontSize(12).text(`${i + 1}. ${tip}`));
    }

    // Warnings
    doc
      .addPage()
      .fontSize(14)
      .text("Incompatibility Warnings", { underline: true });
    doc.moveDown();
    if (warnings.size === 0) {
      doc.text("No warnings based on current garden.");
    } else {
      [...warnings].forEach((w, i) => doc.fontSize(12).text(`${i + 1}. ${w}`));
    }

    doc.end();
  } catch (err) {
    console.error("Error generating PDF export:", err);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
*/

module.exports = router;
