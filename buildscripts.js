import fs from "fs-extra";
import { c } from "tcol";
import esbuild from "esbuild";
import sass from "sass";
import CleanCSS from "clean-css";

async function buildScripts() {
	fs.readdirSync("./assets/js").forEach((file) => {
		console.log(c.Green(`Building ${file}`));

		esbuild.build({
			entryPoints: [`./assets/js/${file}`],
			outfile: `./out/${file}`,
			minify: true,
			bundle: true,
		});
	});

    buildStyles();

	console.log(c.Green("Build complete"));

	return true;
}

function buildStyles() {
    fs.readdirSync("./assets/css").forEach((file) => {
        console.log(c.Green(`Building ${file}`));

        let result = sass.compile(`./assets/css/${file}`);

        fs.writeFileSync(`./out/${file.replace(".scss", ".css")}`, result.css);
    });
}

function minifyCSS() {
	fs.readdirSync("./out").forEach((file) => {
		if (file.endsWith(".css")) {
			console.log(c.Green(`Minifying ${file}`));

			let minified = new CleanCSS().minify(fs.readFileSync(`./out/${file}`, "utf8"));

			fs.writeFileSync(`./out/${file}`, minified.styles);
		}
	});
}


export default buildScripts;
export { minifyCSS };
