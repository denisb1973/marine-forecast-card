class MarineForecastCard extends HTMLElement {
  setConfig(config) {
    this.config = config || {};
  }

  set hass(hass) {
    this._hass = hass;

    this.innerHTML = `
      <ha-card style="
        padding: 16px;
        border-radius: 22px;
        background: rgba(0,15,35,0.95);
        color: white;
        box-shadow: 0 0 30px rgba(0,200,255,0.45);
        border: 1px solid rgba(80,220,255,0.45);
      ">
        <h2 style="margin:0;">
          ${this.config.title || "Prévisions marine"}
        </h2>
        <p style="margin-top:12px;">
          Carte Marine Forecast chargée ✅
        </p>
      </ha-card>
    `;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("marine-forecast-card", MarineForecastCard);
