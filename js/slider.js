const febHolidays = [
	"Dark Chocolate Day",
	"Groundhog Day",
	"Carrot Cake Day",
	"Wear Red Day",
	"Weatherperson's Day",
	"Chopsticks Day",
	"Periodic Table Day",
	"Kite Flying Day",
	"Pizza Day",
	"Umbrella Day",
	"Inventor's Day",
	"Global Movie Day",
	"Tortellini Day",
	"Valentine's Day",
	"Gumdrop Day",
	"Do a Grouch a Favor Day",
	"Cabbage Day",
	"Battery Day",
	"Chocolate Mint Day",
	"Love Your Pet Day",
	"President's Day",
	"Cook a Sweet Potato Day",
	"Tile Day",
	"Toast Day",
	"Clam Chowder Day",
	"Pistachio Day",
	"Polar Bear Day",
	"Tooth Fairy Day"
];

const ulEl = document.querySelector("ul");
const d = new Date();
let daynumber = d.getMonth() == 1 ? d.getDate() - 1 : 0;
let activeIndex = daynumber;
const rotate = -360 / febHolidays.length;
init();

function init() {
	febHolidays.forEach((holiday, idx) => {
		const liEl = document.createElement("li");
		liEl.style.setProperty("--day_idx", idx);
		liEl.innerHTML = `<time datetime="2022-02-${idx + 1}">${
			idx + 1
		}</time><span>${holiday}</span>`;
		ulEl.append(liEl);
	});
	ulEl.style.setProperty("--rotateDegrees", rotate);
	adjustDay(0);
}

function adjustDay(nr) {
	daynumber += nr;
	ulEl.style.setProperty("--currentDay", daynumber);

	const activeEl = document.querySelector("li.active");
	if (activeEl) activeEl.classList.remove("active");

	activeIndex = (activeIndex + nr + febHolidays.length) % febHolidays.length;
	const newActiveEl = document.querySelector(`li:nth-child(${activeIndex + 1})`);
	document.body.style.backgroundColor = window.getComputedStyle(
		newActiveEl
	).backgroundColor;

	newActiveEl.classList.add("active");
}

window.addEventListener("keydown", (e) => {
	switch (e.key) {
		case "ArrowUp":
			adjustDay(-1);
			break;
		case "ArrowDown":
			adjustDay(1);
			break;
		default:
			return;
	}
});
