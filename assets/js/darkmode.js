import {
	enable as enableDarkMode,
	disable as disableDarkMode,
	auto as followSystemColorScheme,
	exportGeneratedCSS as collectCSS,
	isEnabled as isDarkReaderEnabled,
} from "darkreader";

const btn = document.querySelector("#darkmodeToggle")
let darkmode = localStorage.getItem("darkmode") || "false"

btn.addEventListener("click", () => {
    darkmode = darkmode === "true" ? "false" : "true"
    localStorage.setItem("darkmode", darkmode)

    if (darkmode === "true") {
        enableDarkMode()
        btn.innerHTML = "☀️"
    }
    else {
        disableDarkMode()
        btn.innerHTML = "🌙"
    }
})

darkmode === "true" ? enableDarkMode() : disableDarkMode()