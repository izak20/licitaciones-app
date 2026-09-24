// El usuario pidió expresamente que los tooltips de los gráficos sean
// por hover (pasar el cursor), no por clic — lo ve mal tener que
// cliquear. Se reemplaza el mecanismo de clic/toggle por
// mouseenter/mouseleave puro: entrar muestra el dato, salir lo oculta,
// sin necesidad de tocar nada. Aplica a los 3 gráficos que ya tenían
// esta función (Analíticas, Análisis de consumo, Control de temperatura).
const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "Sistema de gestion de bodegas (2).html",
);
const html = fs.readFileSync(filePath, "utf8");
const lines = html.split("\n");

const TEMPLATE_LINE = 392;
let template = JSON.parse(lines[TEMPLATE_LINE]);

function reemplazar(desde, hasta) {
  if (!template.includes(desde)) {
    throw new Error("No se encontró el texto exacto (tooltip hover):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. lineChart(): onClick -> onEnter/onLeave.
reemplazar(
  `        activo: o.tooltipActivo ? o.tooltipActivo(key) : false,
        onClick: o.onDotClick ? o.onDotClick(key) : undefined
      };
    }),
    bandY: band ? Y(band[1]) : 0, bandH: band ? +(Y(band[0]) - Y(band[1])).toFixed(1) : 0,
    legend: o.legend`,
  `        activo: o.tooltipActivo ? o.tooltipActivo(key) : false,
        onEnter: o.onDotEnter ? o.onDotEnter(key) : undefined,
        onLeave: o.onDotLeave || undefined
      };
    }),
    bandY: band ? Y(band[1]) : 0, bandH: band ? +(Y(band[0]) - Y(band[1])).toFixed(1) : 0,
    legend: o.legend`,
);

// 2. barsChart(): onClick -> onEnter/onLeave.
reemplazar(
  `          title: texto,
          activo: o.tooltipActivo ? o.tooltipActivo(key) : false,
          onClick: o.onBarClick ? o.onBarClick(key) : undefined
        };`,
  `          title: texto,
          activo: o.tooltipActivo ? o.tooltipActivo(key) : false,
          onEnter: o.onBarEnter ? o.onBarEnter(key) : undefined,
          onLeave: o.onBarLeave || undefined
        };`,
);

// 3. Método: mostrar/ocultar directo en vez de alternar con clic.
reemplazar(
  `  toggleChartTooltip = (key) => this.setState(s => ({ chartTooltipKey: s.chartTooltipKey === key ? null : key }));`,
  `  mostrarChartTooltip = (key) => this.setState({ chartTooltipKey: key });
  ocultarChartTooltip = () => this.setState({ chartTooltipKey: null });`,
);

// 4. Los 3 puntos que llamaban a barsChart/lineChart con onBarClick/
// onDotClick pasan a usar onEnter/onLeave.
reemplazar(
  `        tooltipPrefix: 'analiticas_',
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarClick: (key) => () => this.toggleChartTooltip(key)
      }),`,
  `        tooltipPrefix: 'analiticas_',
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarEnter: (key) => () => this.mostrarChartTooltip(key),
        onBarLeave: () => this.ocultarChartTooltip()
      }),`,
);
reemplazar(
  `        tooltipPrefix: 'analisis_' + (farmacia ? 'f_' : 'd_'),
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarClick: (key) => () => this.toggleChartTooltip(key)
      }),`,
  `        tooltipPrefix: 'analisis_' + (farmacia ? 'f_' : 'd_'),
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarEnter: (key) => () => this.mostrarChartTooltip(key),
        onBarLeave: () => this.ocultarChartTooltip()
      }),`,
);
reemplazar(
  `        tooltipPrefix,
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onDotClick: (key) => () => this.toggleChartTooltip(key)
      }), { tooltipTexto }),`,
  `        tooltipPrefix,
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onDotEnter: (key) => () => this.mostrarChartTooltip(key),
        onDotLeave: () => this.ocultarChartTooltip()
      }), { tooltipTexto }),`,
);

// 5. Markup de barras: mouseenter/mouseleave en vez de clic; ya no
// hace falta cursor:pointer (no se cliquea).
reemplazar(
  `<div sc-camel-on-click="{{ b.onClick }}" title="{{ b.title }}" style="width:100%;height:{{ b.h }};background:{{ b.color }};border-radius:3px 3px 0 0;cursor:pointer"></div>`,
  `<div sc-camel-on-mouse-enter="{{ b.onEnter }}" sc-camel-on-mouse-leave="{{ b.onLeave }}" title="{{ b.title }}" style="width:100%;height:{{ b.h }};background:{{ b.color }};border-radius:3px 3px 0 0"></div>`,
);

// 6. Markup de la línea: el círculo invisible de "área de toque" pasa
// a ser el área de hover (más grande que el punto visible, más fácil
// de activar con el mouse).
reemplazar(
  `<circle sc-camel-on-click="{{ d.onClick }}" cx="{{ d.cx }}" cy="{{ d.cy }}" r="9" fill="transparent" style="cursor:pointer"></circle>`,
  `<circle sc-camel-on-mouse-enter="{{ d.onEnter }}" sc-camel-on-mouse-leave="{{ d.onLeave }}" cx="{{ d.cx }}" cy="{{ d.cy }}" r="9" fill="transparent"></circle>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Tooltips de gráficos por hover (mouseenter/mouseleave):", filePath);
