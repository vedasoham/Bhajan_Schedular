const bcrypt = require("bcrypt");

const AdminUser = require("../models/AdminUser");

async function initializeSuperAdmin() {
  const superAdminCount = await AdminUser.count({
    where: {
      role: "super_admin"
    }
  });

  if (superAdminCount > 0) {
    return;
  }

  const username = process.env.SUPER_ADMIN_USER;
  const password = process.env.SUPER_ADMIN_PASS;
  const displayName =
    process.env.SUPER_ADMIN_DISPLAY_NAME || "Super Admin";

  if (!username || !password) {
    throw new Error(
      "SUPER_ADMIN_USER and SUPER_ADMIN_PASS must be configured."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

await AdminUser.create({
  username: username.trim().toLowerCase(),
  google_email: process.env.SUPER_ADMIN_GOOGLE_EMAIL
    ? process.env.SUPER_ADMIN_GOOGLE_EMAIL.trim().toLowerCase()
    : null,
  display_name: displayName.trim(),
  password_hash: passwordHash,
  role: "super_admin",
  is_active: true
});

  console.log("✅ Initial super admin account created.");
};

const fs = require("fs");
const path = require("path");

const sequelize = require("../config/database");

const BhajanSubmission = require("../models/BhajanSubmission");
const MasterBhajan = require("../models/MasterBhajan");
const DeityRule = require("../models/DeityRule");

async function loadMasterBhajans() {
  try {
    const count = await MasterBhajan.count();

    if (count !== 0) {
      return;
    }

    const filePath = path.join(__dirname, "..", "master_bhajans.json");

    if (!fs.existsSync(filePath)) {
      console.log(
        "⚠️ master_bhajans.json not found. Skipping load."
      );
      return;
    }

    const data = JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );

    await MasterBhajan.bulkCreate(data);

    console.log(
      `✅ Loaded ${data.length} master bhajans into the database.`
    );
  } catch (error) {
    console.error(
      "Error loading master bhajans:",
      error
    );
  }
}

async function initDeityRules() {
  try {
    const count = await DeityRule.count({
      where: {
        session_date: "default"
      }
    });

    if (count !== 0) {
      return;
    }

    // Attempt migration from deity_rules_v3
    try {
      const [oldRules] = await sequelize.query(
        `
        SELECT
          session_date,
          deity_name,
          min_required,
          max_allowed
        FROM deity_rules_v3
        `
      );

      if (oldRules && oldRules.length > 0) {
        await DeityRule.bulkCreate(oldRules);

        console.log(
          "✅ Migrated old deity rules from v3 to v4."
        );

        return;
      }
    } catch (error) {
      // Ignore if v3 table does not exist
    }

    // Attempt migration from deity_rules_v2
    try {
      const [oldRules] = await sequelize.query(
        `
        SELECT
          session_date,
          deity_name,
          min_required,
          max_allowed
        FROM deity_rules_v2
        `
      );

      if (oldRules && oldRules.length > 0) {
        await DeityRule.bulkCreate(oldRules);

        console.log(
          "✅ Migrated old deity rules from v2 to v4."
        );

        return;
      }
    } catch (error) {
      // Ignore if v2 table does not exist
    }

    await DeityRule.bulkCreate([
      {
        session_date: "default",
        deity_name: "Ganesha",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Guru",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Mata",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "SarvaDharma",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Sai",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Shiva",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Krishna",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Rama",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Vitthala",
        min_required: 0,
        max_allowed: 2
      },
      {
        session_date: "default",
        deity_name: "Hanuman",
        min_required: 0,
        max_allowed: 2
      }
    ]);

    console.log("✅ Created default deity rules.");
  } catch (error) {
    console.error(
      "Error initializing deity rules:",
      error
    );
  }
}

async function migrateLegacySubmissions() {
  const count = await BhajanSubmission.count();

  if (count !== 0) {
    return;
  }

  try {
    const [oldData] = await sequelize.query(
      "SELECT * FROM bhajan_submissions"
    );

    if (!oldData || oldData.length === 0) {
      return;
    }

    const mappedData = oldData.map((row) => {
      const migratedRow = { ...row };

      delete migratedRow.id;

      return migratedRow;
    });

    await BhajanSubmission.bulkCreate(mappedData);

    console.log(
      `✅ Migrated ${oldData.length} records to the new unconstrained database table.`
    );
  } catch (error) {
    // Ignore if legacy table does not exist
  }
}

async function normalizeDeityNames() {
  try {
    await MasterBhajan.update(
      {
        deity: "SarvaDharma"
      },
      {
        where: {
          deity: "Sarva dharma"
        }
      }
    );

    await BhajanSubmission.update(
      {
        deity: "SarvaDharma"
      },
      {
        where: {
          deity: "Sarva dharma"
        }
      }
    );
  } catch (error) {
    console.error(
      "Error normalizing SarvaDharma:",
      error
    );
  }
}

async function initializeDatabase() {
  try {
    await sequelize.sync();

    await initializeSuperAdmin();
    await migrateLegacySubmissions();
    await loadMasterBhajans();
    await initDeityRules();
    await normalizeDeityNames();

    console.log("✅ Database initialization complete.");
  } catch (error) {
    console.error(
      "Database initialization failed:",
      error
    );

    throw error;
  }
}

module.exports = {
  initializeDatabase
};