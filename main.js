let vals = [];
let dates = [];
let sliderVal = 1655352000; //initialize sliderVal
let output = document.getElementById("output");
let button = document.getElementById("myButton");
output.innerHTML = "6/16/2022";

let val_name = "death"; //case, death, or rate

d3.json("ct-towns-2022-simple-datactgov.geojson").then((geojson,err1)=> {
    d3.dsv(",","covid_imp.csv",(d)=>{
        return{
            date:  d.date,
            name: d.city,
            case: +d.case, case_imp: +d.case_imp,
            death: +d.death, death_imp: +d.death_imp,
            rate: +d.rate};
    }).then((data,err2)=>{
        console.log(data);

        //Slider Code
        let slider = document.getElementById("myRange");
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            sliderVal = findClosest(dates,this.value);
            console.log(sliderVal);

            let date = new Date(sliderVal * 1000);
            let year = date.getFullYear();
            let month = date.getMonth()+1;
            let day = date.getDate();
            let formattedTime = month + '/' + day + '/' + year;

            output.innerHTML = formattedTime;
        }

        //Separates the values and dates from the main array
        for (let j =0; j < data.length; j++) {
            vals.push(data[j][val_name]);
            dates.push(data[j]["date"]);
        }

        let max = d3.max(vals);
        let min = d3.min(vals);
        let mid = min + (max-min)/2;

        let continuousColor = d3.scaleLinear([min,max],[0,1.0]); //continuous version
        let colorScale = d3.interpolateHsl(d3.hsl(120,1,0.5),d3.hsl(0,1.0,0.5)); //1 = green, 0 = red

        function discreteColor(value)
        {
            if (value >= mid){
                return 1;
            }
            else{
                return 0;
            }
        }

        //Finds the closest value in 'array' to 'target'
        function findClosest(array, target) {
            let res = array[0];
            for (let i = 1; i < array.length; i++) {

                // update the result if we find a closer element.
                if (Math.abs(array[i] - target) <= Math.abs(res - target)) {
                    res = array[i];
                }
            }
            return res;
        }

        function townStyle(feature){
            return {
                "color": colorScale(continuousColor(feature.properties["val"])), //use colormap or colorscale
                "weight": 1
            }
        }

        function onEachFeature(feature, layer){
            if (feature.properties && feature.properties.val) {
                layer.bindPopup(val_name + " number in " + feature.properties.name + ": " + feature.properties.val.toLocaleString('en-US')); //It doesn't work without the empty string?
            }
        }

        let map = L.map('map').setView([41.38016733657364, -72.10705729845692], 8); //new leaflet map
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        let layerGroup = new L.LayerGroup();
        layerGroup.addTo(map);

        generateMap(findClosest(dates, 1615252500.0)); //Initial generation
        //basic logic flow: if the date is the one given by slider, assign corresponding case value.
        function generateMap(chosenDate, clicked){
            console.log("Running");
            for (let i = 0; i < geojson.features.length; i++) {
                for (let j = 0; j < data.length; j++) {
                    if (data[j]["date"] === chosenDate) {
                        if (geojson.features[i].properties["name"] === data[j]["name"]) {
                            geojson.features[i].properties["val"] = data[j][val_name];
                        }
                    }
                }
            }

            let geojsonLayer = L.geoJSON(geojson,{style:townStyle, onEachFeature:onEachFeature});
            if (clicked) { // Check if the layer exists on the map
                layerGroup.clearLayers();
                console.log("removed");
            }
            layerGroup.addLayer(geojsonLayer);
            layerGroup.addTo(map);
            console.log("added")
        }

        // Add an event listener to the button
        document.getElementById("resetButton").addEventListener("click", function (){
            console.log("clicked!");
            generateMap(findClosest(dates, sliderVal), true);
        });
    });

});