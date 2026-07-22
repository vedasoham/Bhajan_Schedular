const fs = require("fs");
const path = require("path");

const viewsDir = path.join(__dirname, "views");

function processFile(filePath) {
    let content = fs.readFileSync(filePath, "utf8");

    // Skip layout and partials
    if (
        filePath.includes(path.join("views", "layouts")) ||
        filePath.includes(path.join("views", "partials"))
    ) {
        return;
    }

    let original = content;

    // Remove everything before <body>
    content = content.replace(
        /^[\s\S]*?<body[^>]*>/i,
        ""
    );

    // Remove everything after </body>
    content = content.replace(
        /<\/body>\s*<\/html>\s*$/i,
        ""
    );

    content = content.trim() + "\n";

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log("✓", path.relative(__dirname, filePath));
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {

        const full = path.join(dir, file);

        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
            walk(full);
        }
        else if (file.endsWith(".ejs")) {
            processFile(full);
        }

    });
}

walk(viewsDir);

console.log("\n🎉 Layout migration complete.");