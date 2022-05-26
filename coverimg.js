import * as canvas from "canvas";

const { createCanvas, loadImage } = canvas.default;

function coverimage(text) {
	const width = 1200;
	const height = 630;

	const canvas = createCanvas(width, height);
	const context = canvas.getContext("2d");

	context.fillStyle = "#000";
	context.fillRect(0, 0, width, height);

	context.font = "bold 70pt sans-serif";
	context.textAlign = "center";
	context.textBaseline = "top";
	const randHex = (Math.random() * 0xffffff) << 0;
    context.fillStyle = "#" + randHex.toString(16);

	const textWidth = context.measureText(text).width;
	context.fillRect(600 - textWidth / 2 - 10, 170 - 5, textWidth + 20, 120);
	context.fillStyle = "#fff";
	context.fillText(text, 600, 170);

	return canvas.toBuffer();
}

export default coverimage;