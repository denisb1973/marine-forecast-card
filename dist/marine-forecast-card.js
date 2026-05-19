class MarineForecastCard extends HTMLElement {
  setConfig(config) {
    this.config = config || {};
    this.selectedDay = "Aujourd’hui";
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getState(entity) {
    return this._hass?.states?.[entity]?.state ?? "-";
  }

  forecast(entity, offset) {
    const attrs = this._hass?.states?.[entity]?.attributes || {};
    const times = attrs.time || [];

    const d = new Date();
    d.setDate(d.getDate() + offset);
    const ymd = d.toISOString().slice(0, 10);

    let i = times.findIndex(t => t.startsWith(ymd + "T12"));
    if (i < 0) i = times.findIndex(t => t.startsWith(ymd));
    if (i < 0) i = 0;

    return {
      wave: attrs.wave_height?.[i] ?? "-",
      dir: attrs.wave_direction?.[i] ?? "-",
      period: attrs.wave_period?.[i] ?? "-",
      temp: attrs.sea_surface_temperature?.[i] ?? "-"
    };
  }

  status(data, currentVelocity) {
    const wave = parseFloat(data.wave || 99);
    const period = parseFloat(data.period || 99);
    const current = parseFloat(currentVelocity || 99);

    let score = 0;

    // HOULE
    if (wave < 0.3) score += 4;
    else if (wave < 0.5) score += 3;
    else if (wave < 0.8) score += 2;
    else if (wave < 1.2) score += 1;

    // PÉRIODE
    if (period < 4) score += 3;
    else if (period < 6) score += 2;
    else if (period < 8) score += 1;

    // COURANT
    if (current < 0.2) score += 3;
    else if (current < 0.5) score += 2;
    else if (current < 0.8) score += 1;

    if (score >= 9) {
      return { txt: "EXCELLENT", color: "#00ff88", score };
    }

    if (score >= 7) {
      return { txt: "BON", color: "#5cff6d", score };
    }

    if (score >= 4) {
      return { txt: "JOUABLE", color: "#ffcc4d", score };
    }

    return { txt: "MAUVAIS", color: "#ff5c5c", score };
  }

  conclusion(datas) {
    const best = datas
      .map(d => ({ name: d.name, h: parseFloat(d.data.wave || 99) }))
      .sort((a, b) => a.h - b.h)[0];

    if (!best) {
      return {
        txt: "DONNÉES INDISPONIBLES",
        sub: "Vérifie les entités météo marine",
        color: "#ffcc4d"
      };
    }

    if (best.h < 0.4) {
      return {
        txt: "CHASSE RECOMMANDÉE",
        sub: `Conditions favorables • ${best.name}`,
        color: "#5cff6d"
      };
    }

    if (best.h < 0.8) {
      return {
        txt: "CHASSE POSSIBLE",
        sub: `À vérifier sur place • ${best.name}`,
        color: "#ffcc4d"
      };
    }

    return {
      txt: "CHASSE DÉCONSEILLÉE",
      sub: "Mer trop formée sur les spots",
      color: "#ff5c5c"
    };
  }

  spotCard(spot, data) {
    const currentVelocity = this.getState(spot.current_velocity_entity);
    const s = this.status(data, currentVelocity);
    const currentDirection = this.getState(spot.current_direction_entity);

    return `
      <div class="spot" style="background-image:
        linear-gradient(rgba(0,15,35,0.30), rgba(0,10,25,0.88)),
        url('${spot.image}');
      ">
        <div class="spot-title">${spot.name}</div>

        <div class="badge" style="
          border-color:${s.color};
          color:${s.color};
          box-shadow:0 0 24px ${s.color};
        ">
          ${s.txt}<br><small>${s.score}/10</small>
        </div>

        <div class="grid-info">
          <div>🌊<span>${data.wave} m</span><small>HOULE</small></div>
          <div>🧭<span>${data.dir}°</span><small>DIR HOULE</small></div>
          <div>⏱<span>${data.period} s</span><small>PÉRIODE</small></div>
          <div>🌡<span>${data.temp}°C</span><small>MER</small></div>
          <div>〰️<span>${currentVelocity}</span><small>COURANT</small></div>
          <div>🧭<span>${currentDirection}°</span><small>DIR COURANT</small></div>
        </div>
      </div>
    `;
  }

  render() {
    const days = ["Aujourd’hui", "Demain", "J+2", "J+3", "J+4"];
    const offsetMap = {
      "Aujourd’hui": 0,
      "Demain": 1,
      "J+2": 2,
      "J+3": 3,
      "J+4": 4
    };

    const offset = offsetMap[this.selectedDay] ?? 0;
    const spots = this.config.spots || [];

    const datas = spots.map(spot => ({
      name: spot.name,
      data: this.forecast(spot.forecast_entity, offset),
      spot
    }));

    const c = this.conclusion(datas);

    this.innerHTML = `
      <ha-card>
        <div class="wrapper">

          <div class="days">
            ${days.map(day => {
  const dayOffset = offsetMap[day] ?? 0;
  const dayDatas = spots.map(spot => ({
    name: spot.name,
    data: this.forecast(spot.forecast_entity, dayOffset),
    spot
  }));

  const dayConclusion = this.conclusion(dayDatas);
  const active = this.selectedDay === day ? "active" : "";

  return `
    <button
      class="${active}"
      data-day="${day}"
      style="
       border-color:${dayConclusion.color};
       box-shadow:0 0 18px ${dayConclusion.color};
       background: linear-gradient(
         135deg,
         ${dayConclusion.color}55,
         rgba(0,20,40,0.95)
       );
      "
    >
      ${day}
    </button>
  `;
}).join("")}
          </div>

          <div class="content">
            <div class="spots">
              ${datas.map(d => this.spotCard(d.spot, d.data)).join("")}
            </div>

            <div class="conclusion" style="background-image:
              linear-gradient(90deg, rgba(0,10,25,0.55), rgba(0,10,25,0.95)),
              url('${this.config.conclusion_image || "/local/plongeur.jpg"}');
            ">
              <div class="conclusion-title" style="
                color:${c.color};
                text-shadow:0 0 18px ${c.color};
              ">
                ${c.txt}
              </div>
              <div class="conclusion-text">${c.sub}</div>
              <div class="conclusion-note">Courant = valeur actuelle Open-Meteo</div>
            </div>
          </div>

        </div>

        <style>
          ha-card {
            width: 100%;
            max-width: 100%;
            border-radius: 22px;
            overflow: hidden;
            background: rgba(0,15,35,0.95);
            box-shadow: 0 0 30px rgba(0,200,255,0.45);
            border: 1px solid rgba(80,220,255,0.45);
            padding: 14px;
            box-sizing: border-box;
          }

          .wrapper {
            color: white;
            font-family: system-ui;
          }

          .days {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }

          .days button {
            border-radius: 16px;
            padding: 10px 4px;
            border: 1px solid rgba(80,220,255,0.45);
            background: rgba(0,20,40,0.82);
            color: white;
            font-size: 11px;
            font-weight: 900;
            box-shadow: 0 0 8px rgba(0,100,150,0.25);
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
          }

          .days button.active {
            appearance: none !important;
            -webkit-appearance: none !important;
            background: linear-gradient(135deg, rgba(0,220,255,0.95), rgba(0,90,180,0.95)) !important;
            box-shadow: 0 0 22px rgba(0,220,255,0.95) !important;
            border: 1px solid rgba(120,240,255,0.95) !important;
            color: white !important;
            text-shadow: 0 0 8px rgba(255,255,255,0.85);
          }

          .content {
            width: 100%;
            max-width: none;
            margin: 0;
          }

         .spots {
           width: 100%;
           display: grid;
           grid-template-columns: repeat(${Math.max(spots.length, 1)}, minmax(0, 1fr));
           gap: 14px;
          }

          .spot {
            min-height: 400px;
            border-radius: 18px;
            padding: 10px;
            background-size: cover;
            background-position: center;
            border: 1px solid rgba(0,210,255,0.5);
            box-shadow: inset 0 0 28px rgba(0,180,255,0.18), 0 0 18px rgba(0,200,255,0.28);
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .spot-title {
            font-size: 25px;
            font-weight: 900;
            text-shadow: 0 0 12px black;
          }

          .badge {
            margin: 22px 0 18px;
            width: 95px;
            height: 95px;
            border: 4px solid;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 17px;
            background: rgba(0,0,0,0.42);
          }
          .badge small {
            font-size: 11px;
            opacity: 0.85;
          }

          .grid-info {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-top: auto;
          }

          .grid-info div {
            background: rgba(0,20,40,0.76);
            border-radius: 12px;
            padding: 10px 6px;
            text-align: center;
            border: 1px solid rgba(126,232,255,0.28);
          }

          .grid-info span {
            display: block;
            font-size: 17px;
            font-weight: 900;
          }

          .grid-info small {
            color: #7ee8ff;
            font-size: 9px;
            font-weight: 800;
          }

          .conclusion {
            margin-top: 14px;
            min-height: 95px;
            border-radius: 18px;
            padding: 14px;
            background-size: cover;
            background-position: center;
            border: 1px solid rgba(0,210,255,0.5);
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: right;
          }

          .conclusion-title {
            font-size: 22px;
            font-weight: 900;
          }

          .conclusion-text {
            font-size: 14px;
            font-weight: 800;
            margin-top: 4px;
          }

          .conclusion-note {
            color: #7ee8ff;
            font-size: 10px;
            font-weight: 700;
            margin-top: 5px;
          }

          @media screen and (max-width:700px) {
            ha-card {
              padding: 6px;
            }

            .spots {
              grid-template-columns: 1fr;
              gap: 10px;
            }

            .spot {
              min-height: 360px;
            }

            .grid-info {
              grid-template-columns: 1fr 1fr;
              gap: 6px;
            }

            .spot-title {
              font-size: 20px;
            }

            .badge {
              width: 78px;
              height: 78px;
              font-size: 13px;
            }

            .grid-info span {
              font-size: 15px;
            }

            .conclusion {
              text-align: center;
            }
          }
        </style>
      </ha-card>
    `;

    this.querySelectorAll("button[data-day]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedDay = btn.dataset.day;
        this.render();
      });
    });
  }

  getCardSize() {
  return 20;
}

getLayoutOptions() {
  return {
    grid_columns: 12,
    grid_rows: 8
  };
}
}
customElements.define("marine-forecast-card", MarineForecastCard);
