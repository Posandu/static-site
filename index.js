import fs from "fs-extra";
import showdown from "showdown";
import showdownHighlight from "showdown-highlight";
import { c } from "tcol";
import { exec } from "child_process";
import buildScripts from "./buildscripts.js";
import { minifyCSS } from "./buildscripts.js";
import coverimage from "./coverimg.js";

const { log } = console;

const posts = fs.readdirSync("./posts");

// Store all the posts in an array
let all_posts = [];
let categories = [];

const SITEURL = "http://127.0.0.1:8000";

// Util functions
const template = (name, data) => {
	let templateHTML = fs.readFileSync("./templates/" + name + ".html", "utf8");

	for (let key in data) {
		templateHTML = templateHTML.replaceAll(`{${key}}`, data[key]);
	}

	return templateHTML.replaceAll("%SITEURL%", SITEURL);
};

const removeHTML = (str) => str.replace(/<[^>]*>?/gm, "");

// Clear the output directory
fs.emptyDirSync("./out");

// Loop through all the posts and create the HTML files
posts.forEach((post) => {
	const outdir = `./out/${post}`;

	fs.mkdirSync(outdir);

	fs.copySync(`./posts/${post}/index.md`, `./out/${post}/index.html`);

	fs.copySync(`./posts/${post}/images`, `./out/${post}`);

	const converter = new showdown.Converter({
		metadata: true,
		omitExtraWLInCodeBlocks: true,
		openLinksInNewWindow: true,
		emoji: true,
		extensions: [
			showdownHighlight({
				pre: true,
			}),
		],
	});

	let content = fs.readFileSync(`./posts/${post}/index.md`, "utf8");

	let html = converter.makeHtml(content);

	let meta = converter.getMetadata();

	for (let key in meta) {
		meta[key] = meta[key].replaceAll("&quot;", "");
	}

	html = html.replaceAll(/images\//g, "");

	fs.writeFileSync(
		`./out/${post}/index.html`,

		template("head") +
			template("header") +
			template("article", {
				title: meta.title,
				meta: `Created: ${meta.date}`,
				content: html,
				imgurl: meta.coverImage,
				link: `/${post}/`,
				tags: meta.tags || "",
				categories: (meta.categories || "")
					.split(",")
					.map((category) =>
						template("category", { category: category.trim() })
					)
					.join(""),
			}) +
			template("footer")
	);

	all_posts.push({
		title: meta.title,
		date: meta.date,
		tags: meta.tags,
		coverImage: meta.coverImage,
		slug: post,
		content: html,
		categories: meta.categories,
	});

	meta.categories &&
		categories.push((meta.categories + "").split(",").map((cat) => cat.trim()));

	log(c.Black(`${post}`), c.Green(`done`));
});

// Sort the posts by date
all_posts.sort((a, b) => {
	return new Date(b.date) - new Date(a.date);
});

// The Home page
fs.writeFileSync(
	`./out/index.html`,

	template("head") +
		template("header") +
		template("home", {
			featuredpost: template("featuredpost", {
				title: all_posts[0].title,
				meta: `Created: ${all_posts[0].date}`,
				summary: removeHTML(all_posts[0].content).substring(0, 60),
				imgurl: all_posts[0].slug + "/" + all_posts[0].coverImage,
				link: `/${all_posts[0].slug}/`,
				tags: all_posts[0].tags || "",
			}),

			articles: all_posts
				.slice(1)
				.slice(0, 4)
				.map((post) => {
					return template("articlebox", {
						title: post.title,
						meta: `Created: ${post.date}`,
						summary: removeHTML(post.content).substring(0, 60) + "...",
						imgurl: post.slug + "/" + post.coverImage,
						link: `/${post.slug}/`,
						tags: post.tags || "",
					});
				})
				.join(""),
		}) +
		template("footer")
);

// Paginate posts by 8 per page
const pages = Math.ceil(all_posts.length / 8);

// loop [pages] times
[...Array(pages).keys()].forEach((page) => {
	let paginated_posts = all_posts.slice(page * 8, (page + 1) * 8);

	// Create directory for the page
	if (page === 0) {
		fs.mkdirSync(`./out/archive`);
		fs.mkdirSync(`./out/archive/page`);
	}

	fs.mkdirSync(`./out/archive/page/${page + 1}`);

	fs.writeFileSync(
		`./out/archive/page/${page + 1}/index.html`,

		template("head") +
			template("header") +
			template("archive", {
				articles: paginated_posts
					.map((post) => {
						return template("articlebox", {
							title: post.title,
							meta: `Created: ${post.date}`,
							summary: removeHTML(post.content).substring(0, 60) + "...",
							imgurl: post.slug + "/" + post.coverImage,
							link: `/${post.slug}/`,
							tags: post.tags || "",
						});
					})
					.join(""),
				paginate: `${
					page > 0
						? template("link", {
								link: `/archive/page/${page}/`,
								text: `Page ${page}`,
						  })
						: ""
				}${
					page < pages - 1
						? template("link", {
								link: `/archive/page/${page + 2}/`,
								text: `Page ${page + 2}`,
						  })
						: ""
				}`,
			}) +
			template("footer")
	);
});

// Create index page in archive
fs.createFileSync(`./out/archive/pic.ong`, coverimage("Archive"));

fs.writeFileSync(
	`./out/archive/index.html`,
	template("head", {
		title: "Archive",
		description: "Archive of all posts",
		image: SITEURL + "/archive/pic.ong",
		url: SITEURL + "/archive/",
	}) +
		template("header") +
		template("archive", {
			articles: all_posts
				.slice(0, 8)
				.map((post) => {
					return template("articlebox", {
						title: post.title,
						meta: `Created: ${post.date}`,
						summary: removeHTML(post.content.substring(0, 60) + "..."),
						imgurl: post.slug + "/" + post.coverImage,
						link: `/${post.slug}/`,
						tags: post.tags || "",
					});
				})
				.join(""),
			paginate: template("link", {
				link: "/archive/page/2/",
				text: "Next",
			}),
		}) +
		template("footer")
);

// categories
categories = [...new Set(categories.flat())];

if (!fs.existsSync(`./out/category`)) {
	fs.mkdirSync(`./out/category/`);
}

categories.forEach((cat) => {
	if (!cat.trim()) return;

	// Find all posts with the category
	let posts = all_posts.filter((post) => {
		return post.categories && post.categories.includes(cat);
	});

	fs.mkdirSync(`./out/category/${cat}`);

	fs.writeFileSync(
		`./out/category/${cat}/pic.png`,
		coverimage("Category \n" + cat)
	);

	// Paginate posts by 8 per page
	const pages = Math.ceil(posts.length / 8);

	// loop [pages] times
	[...Array(pages).keys()].forEach((page) => {
		let paginated_posts = posts.slice(page * 8, (page + 1) * 8);

		// Create directory for the page
		// Check if directory exists
		if (!fs.existsSync(`./out/category/${cat}/page`)) {
			fs.mkdirSync(`./out/category/${cat}/page`);
		}

		fs.mkdirSync(`./out/category/${cat}/page/${page + 1}`);

		fs.writeFileSync(
			`./out/category/${cat}/page/${page + 1}/index.html`,

			template("head", {
				title: `${cat} page ${page + 1}`,
				description: `${cat} page ${page + 1}`,
				image: `/category/${cat}/pic.png`,
				url: `/category/${cat}/page/${page + 1}/`,
			}) +
				template("header") +
				template("archive", {
					articles: paginated_posts
						.map((post) => {
							return template("articlebox", {
								title: post.title,
								meta: `Created: ${post.date}`,
								summary: removeHTML(post.content).substring(0, 60) + "...",
								imgurl: post.slug + "/" + post.coverImage,
								link: `/${post.slug}/`,
								tags: post.tags || "",
							});
						})
						.join(""),
					paginate: `${
						page > 0
							? template("link", {
									link: `/category/${cat}/page/${page}/`,
									text: `Page ${page}`,
							  })
							: ""
					}<wbr/>${
						page < pages - 1
							? template("link", {
									link: `/category/${cat}/page/${page + 2}/`,
									text: `Page ${page + 2}`,
							  })
							: ""
					}`,
				}) +
				template("footer")
		);
	});

	// Create index page in category

	fs.writeFileSync(
		`./out/category/${cat}/index.html`,

		template("head", {
			title: `Category ${cat}`,
			description: `Articles for the category ${cat}`,
			url: `/category/${cat}/`,
			image: `/category/${cat}/pic.png`,
		}) +
			template("header") +
			template("archive", {
				articles: posts
					.slice(0, 8)
					.map((post) => {
						return template("articlebox", {
							title: post.title,
							meta: `Created: ${post.date}`,
							summary: removeHTML(post.content.substring(0, 60) + "..."),
							imgurl: post.slug + "/" + post.coverImage,
							link: `/${post.slug}/`,
							tags: post.tags || "",
						});
					})
					.join(""),
				paginate: template("link", {
					link: `/category/${cat}/page/2/`,
					text: "Next page",
				}),
			}) +
			template("footer")
	);
});

// Upload the static files
fs.copySync("./static", "./out/static");

buildScripts().then(() => {
	// Run shell scripts
	exec("npm run css", (err, stdout, stderr) => {
		if (err) {
			console.error(`exec error: ${err}`);
			return;
		} else {
			log(c.Black(`CSS`), c.Green(`done`));

			minifyCSS();
		}
	});
});
