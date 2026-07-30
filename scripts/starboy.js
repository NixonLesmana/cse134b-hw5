class HelloWorld extends HTMLElement {
    connectedCallback() {
        console.log("Hello World!");
    }
}

customElements.define("hello-world", HelloWorld);

const stageLightButton = document.querySelector("#stage-light-toggle");
const savedStageLightMode = localStorage.getItem("stageLights");

function setStageLights(isOn) {
    document.body.classList.toggle("stage-lights-on", isOn);
    stageLightButton.setAttribute("aria-pressed", String(isOn));
    stageLightButton.textContent = isOn ? "Stage Lights On" : "Stage Lights";
    localStorage.setItem("stageLights", isOn ? "on" : "off");
}

if (stageLightButton) {
    setStageLights(savedStageLightMode === "on");

    stageLightButton.addEventListener("click", () => {
        const isCurrentlyOn = stageLightButton.getAttribute("aria-pressed") === "true";
        setStageLights(!isCurrentlyOn);
    });
}