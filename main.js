//
// Place any custom JS here
//

// method to load in html code

// charts for resource and performance
const rsc_ctx = document.getElementById('rscChart').getContext('2d');
const perf_ctx = document.getElementById('perfChart').getContext('2d');
const pareto_ctx = document.getElementById('paretoChart').getContext('2d');

// graph for hardware model
const graph = document.getElementById("graph-wrapper");
const designSlide = document.getElementById("design-slide");

// flags
var graphUpdate = true;
var isRunning = false;
var isPaused = false;

// latency and throughput maps
var throughput = new Map();
var latency = new Map();
var resource = new Map();

// initialise to zero
throughput.set("0", 0.0);
latency.set("0", 0.0);
resource.set("0", [0.0, 0.0, 0.0, 0.0]);

// graph window sizes
const graphInnerWidth = graph.offsetWidth-5;
const graphInnerHeight = graph.offsetHeight-5;

// selected point
var selectedPoint = 0;

// initialise all the data
for (let i = 0; i < 40; i++) {

  // load the log file
  let logFilePath = "log/"+i+".json";
  let data = loadFile(logFilePath);
  let log = JSON.parse(data);

  // update the maps
  latency.set(i.toString(), log["latency"])
  throughput.set(i.toString(), log["throughput"])
  resource.set(i.toString(), [
      log['resource']['LUT'],
      log['resource']['FF'],
      log['resource']['DSP'],
      log['resource']['BRAM']
  ])

}

var latest_log_file = 40;


function removeExtension(filename) {
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
}

// transition between graphs
function transitionFactory() {
    return d3.transition("main")
        .ease(d3.easeLinear)
        .delay(20)
        .duration(500);
}

// graph creator
var graphviz = d3.select("#graph").graphviz()
    .logEvents(false)
    .transition(transitionFactory)
    .tweenShapes(false)
    .tweenPaths(false)
    .zoomScaleExtent([0.05, 100])
;

// function to load local file
function loadFile(filePath) {
  if(filePath == "vis/..") {
    filePath = "vis/base.dot";
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", filePath, false);
  xmlhttp.send();
  if (xmlhttp.status==200) {
    return xmlhttp.responseText;
  }
}


// create a horizontal bar chart
const rscChart = new Chart(rsc_ctx, {
    type: 'bar',
    data: {
        labels: ['LUT', 'FF', 'DSP', 'BRAM'],
        datasets: [{
            data: [0.0, 0.0, 0.0, 0.0],
            borderColor:  [
              "rgb(255, 99, 132, 1.0)", // red
              "rgb(54, 162, 235, 1.0)", // blue
              "rgb(153, 102, 255, 1.0)", // purple
              "rgb(255, 159, 64, 1.0)", // orange
            ],
            backgroundColor: [
              "rgb(255, 99, 132, 0.6)", // red
              "rgb(54, 162, 235, 0.6)", // blue
              "rgb(153, 102, 255, 0.6)", // purple
              "rgb(255, 159, 64, 0.6)", // orange
            ],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        indexAxis: 'y',
        scales: {
          x: {
            display: true,
            beginAtZero: true,
            max: 100,
            title: {
              text: "Resource Usage (%)",
              display: true,
            }
          },
        },
        plugins: {
          legend: {
            display: false
          }
        }
    }
});

// create a horizontal line chart for performance
const perfChart = new Chart(perf_ctx, {
    type: 'line',
    data: {
      labels: ["0"],
      datasets: [
        {
          label: "throughput",
          data: [0.0],
          borderColor: "rgb(255, 99, 132, 1.0)", // red
          backgroundColor: "rgb(255, 99, 132, 0.6)", // red
          yAxisID: 'y'
        },
        {
          label: "latency",
          data: [0.0],
          borderColor: "rgb(54, 162, 235, 1.0)", // blue
          backgroundColor: "rgb(54, 162, 235, 0.6)", // red
          yAxisID: 'y1'
        }
      ]
    },
    options: {
        stacked: false,
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Design Point Index'
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Throughput (img/s)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Latency (s/batch)',
            },
            // grid line settings
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
          }
        },
        plugins: {
        }
    }
});

// create a horizontal line chart for performance
const paretoChart = new Chart(pareto_ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: "Pareto Front",
          data: { x: 0, y: 0 },
          backgroundColor: "rgb(255, 99, 132)", // red
        },
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Resource Usage (%)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Performance'
          }
        },
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
});


// function to render graph
function rsc_chart_render() {
    // update chart
    console.log("rendering resource chart: "+latest_log_file);
    rsc_chart_render_once(latest_log_file);
}

function rsc_chart_render_once(filePath) {
    // update chart
    let data = loadFile(filePath);
    let log = JSON.parse(data);
    rscChart.data.datasets[0].data = [
        log['resource']['LUT'],
        log['resource']['FF'],
        log['resource']['DSP'],
        log['resource']['BRAM']
    ];
    rscChart.update();
}

// function to render graph
function perf_chart_render() {
  // update chart
  console.log("rendering performance chart: "+latest_log_file);
  // update throughput and latency
  perfChart.data.datasets[0].data = Array.from(throughput.values());
  perfChart.data.datasets[1].data = Array.from(latency.values());
  perfChart.data.labels = Array.from(throughput.keys());
  perfChart.update();
}

function average(arr) {
  return arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
}

const zip = (a, b) => a.map((k, i) => [k, b[i]]);

// function to render graph
function pareto_chart_render() {
  // update chart
  console.log("rendering pareto chart: "+latest_log_file);
  // update throughput and latency
  let cost = Array.from(throughput.values());
  let rsc = Array.from(resource.values()).map( (arr) => average(arr) );
  paretoChart.data.datasets[0].data = zip(rsc,cost);
  paretoChart.options.scales.y.title.text = "Throughput (img/s)";
  paretoChart.update();
}

// function to render graph
function graph_render() {
  // update graph visualisation
  if( isRunning && graphUpdate ) {
    console.log("rendering graph: "+latest_vis_file);
    // render new graph
    graph_render_once(latest_vis_file).on("end", function() {
        graph_render();
      });

  }
}

function attributer(datum, index, nodes) {
    var selection = d3.select(this);
    if (datum.tag == "svg") {
        var width = window.innerWidth;
        var height = window.innerHeight;
        var x = 200;
        var y = 10
        var scale = 0.75;
        selection
            .attr("width", width + "pt")
            .attr("height", height + "pt")
            .attr("viewBox", -x + " " + -y + " " + (width / scale) + " " + (height / scale));
        datum.attributes.width = width + "pt";
        datum.attributes.height = height + "pt";
        datum.attributes.viewBox = -x + " " + -y + " " + (width / scale) + " " + (height / scale);
    }
}

// function to render a given dot-graph file
function graph_render_once(filePath) {
    let data = loadFile(filePath);
    return graphviz
      .fit(true)
      .width(graphInnerWidth)
      .height(graphInnerHeight)
      // .attributer(attributer)
      .renderDot(data)
    ;
}

// run optimiser button
function startOptimiser() {
    // start the optimiser
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", `run-optimiser.php?model=${model.files[0].name}&platform=${platform.value}&objective=${objective.value}&optimiser=${optimiser.value}&batch_size=${batch_size.value}`);
    xmlhttp.send(null);
    // clear throughput and latency
    throughput.clear();
    latency.clear();
    // initialise to zero
    throughput.set("0", 0.0);
    latency.set("0", 0.0);
    // set the latest files to base
    latest_vis_file = "outputs/base.dot";
    latest_log_file = "outputs/base.log";
    isRunning = true;
    console.log("isRunning: "+isRunning+", graphUpdate: "+graphUpdate);
    graph_render();
}

// stop optimiser button
function stopOptimiser() {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", "stop-optimiser.php");
  xmlhttp.send(null);
  // set flags
  isRunning = false;
  isPaused = false;
}

function sliderHandler() {
    // get the slider value
    let sliderValue = this.value;
    // get the log dot graph file
    let dotGraphFilePath = "vis/"+sliderValue+".dot";
    // upate the graph
    graph_render_once(dotGraphFilePath);
    // highlight point on performance chart
    selectedPoint = sliderValue-1;
    perfChart.data.datasets[0].data = Array.from(throughput.values()).slice(0,sliderValue);
    perfChart.data.datasets[1].data = Array.from(latency.values()).slice(0,sliderValue);
    perfChart.data.labels = Array.from(throughput.keys()).slice(0,sliderValue);
    perfChart.update();
    // highlight point on pareto chart
    let cost = Array.from(throughput.values()).slice(0,sliderValue);
    let rsc = Array.from(resource.values()).map( (arr) => average(arr) ).slice(1,sliderValue);
    paretoChart.options.scales.y.title.text = "Throughput (img/s)";
    paretoChart.data.datasets[0].data = zip(rsc,cost);
    paretoChart.update();
    // change rsc chart
    let logFilePath = "log/"+sliderValue+".json";
    rsc_chart_render_once(logFilePath);
}

// initialise all graphs
graph_render_once("vis/0.dot");
rsc_chart_render_once("log/0.json");
perf_chart_render();
pareto_chart_render();

// range slider handler
designSlide.addEventListener('change', sliderHandler);

// // set intervals for updating charts and graphs
// setInterval(rsc_chart_render, 750);

// set intervals for updating charts and graphs
setInterval(perf_chart_render, 750);

// set intervals for updating charts and graphs
setInterval(pareto_chart_render, 750);

// // toggle graphUpdate flag
// update_graph.addEventListener('click', function() {
//   // graphUpdate = !graphUpdate;
//   graphUpdate = update_graph.checked;
// });

console.log(latency);
