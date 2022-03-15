/*
 This is the frontend of the Local Legends app. It runs in the browser.
 Fetches our Google API key from the backend (NodeJS)  
 Fetches and initializes Google Maps from Google. 
 Fetches stories from MongoDB via the backend (NodeJS) 
 Builds Info Windows for Stories. 
 Gives User tools to add a new story (GMaps + input form)
 Posts new stories to MongoDB via NodeJS
 */

 /* IMPORTANT: Explore the Google Maps documentation for further details and examples.
 https://developers.google.com/maps/documentation/javascript/examples/infoWindow-simple */

const mapSection = document.querySelector("section#map");
const mapButton = document.querySelector("#mapButton");

const createSection = document.querySelector("section#create");
const createForm = document.querySelector("#createForm");
const createText = document.querySelector('#createText');
const createButton = document.querySelector("#createButton");

const goButton = document.querySelector("#goButton");

const refreshButton = document.querySelector("#refreshButton");

let pickerMap             /* Map to choose a location */
let pickerMarker          /* A draggable map marker used to pick a location */

let storyMap             /* Map for stories. */ 
let storyBounds          /* defines an area on the map bit enough to fit all stories. */ 
let currentStory        /* keeps track of which info-window is currently open.*/
let activeMarkers = []       /* keep track of the stories currently on the map. */ 

/* The "initMap" function initializes the Google Map.  
It runs automatically via a callback after the Google Maps script loads. 
*/
function initMap(){
  
  /* Here we ask the browser for the user's location.
  This involves a consent step. See also, MDN Documentation for the Geolocation API: 
  https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API */ 

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      let userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
      };

      let storyMapOptions = {
        center: userLocation,
        disableDefaultUI: true
      }
      // this map is for showing existing stories.
      storyMap = new google.maps.Map(
        document.querySelector('#storyMap'), 
        storyMapOptions
      );
      
      // the storyBounds get extended whenever we add a point. 
      // here we are adding the user's location to initialize the storyBounds
  
      fetchStories(userLocation);

      // After the map tiles have finished loading,
      // Enable a refresh button when Zooming or Panning
      google.maps.event.addListenerOnce(storyMap, 'tilesloaded', () => {
        google.maps.event.addListener(storyMap, 'zoom_changed', () => {
          refreshButton.style.display = 'block'; 
        });
        google.maps.event.addListener(storyMap, 'dragend', () => {
          refreshButton.style.display = 'block'; 
        }); 
      })


      let pickerMapOptions = {
        center: userLocation,
        zoom: 12,
        disableDefaultUI: true
      }
      // pickerMap will show UI for choosing a location for a new story
      pickerMap = new google.maps.Map(
        document.querySelector('#pickerMap'), 
        pickerMapOptions
      );
      pickerMarker = new google.maps.Marker({
          position: userLocation,
          map: pickerMap,
          icon: {
            url: "create.svg",
            anchor: new google.maps.Point(50,100),
            scaledSize: new google.maps.Size(100,100)
          },
          draggable: true 
      });
      //Listen for drag events on the picker marker
      google.maps.event.addListener(pickerMarker, 'dragend', (event) => {
        pickerMap.panTo( pickerMarker.getPosition() )
        console.log ( pickerMarker.getPosition())
      });
      //Listen for any clicks on the map.
      google.maps.event.addListener(pickerMap, 'click',  (event) =>  {                
        pickerMarker.setPosition(event.latLng); 
        pickerMap.panTo( pickerMarker.getPosition() ) 
      });  
      
      // listen for drag events on the map. 
      google.maps.event.addListener(pickerMap, 'dragend',  () =>  {                
        pickerMarker.setPosition(pickerMap.getCenter()); 
        pickerMap.panTo( pickerMarker.getPosition() ) 
      }); 
    });
  }
}
 

/* Send a POST request to the "stories" endpoint. 
send along the  user's location as JSON data in the body of the request. 
NodeJS will use this data to query MongoDB for Stories */ 
const fetchStories = (location) => {
  storyBounds = new google.maps.LatLngBounds();
  storyBounds.extend(location); 

  console.log();

  fetch("stories", {
    body: JSON.stringify(location),
    method: 'POST',
    headers: {'Content-Type': 'application/json'}
  })
  .then(response => response.json())
  .then(stories => { 
    console.log(stories);
    for (story of stories) { 
      /* pass along each story to be mapped.*/ 
      mapStory( story )
    } 
    refreshButton.style.display = 'none'; 
  })
  .catch(err => { console.error(err)  });
}

/* Given a JSON object that describes a story, 
we are ready to add it to the map.*/
const mapStory = (story) => {
  /* Each story includes GPS coordinates.
  Here, we set up these coordinates in a way that Google understands. */ 
  let storyLocation = new google.maps.LatLng(
    story.location.coordinates[1],
    story.location.coordinates[0]
  );
  /* extend the storyBounds of the map to fit each new point */ 
  storyBounds.extend(storyLocation);
  storyMap.fitBounds(storyBounds);
  /* Make an "infoWindow" for each story. 
  This is like a bubble that appears when we click on a marker.
  You could modify this template to show a variety of details. */ 
  let infoWindow = new google.maps.InfoWindow({
    maxWidth: 300,
    content: `<p> ${story.content} </p>`
  });
  /* Markers are customizable with icons, etc.*/ 
  let marker = new google.maps.Marker({
    position: storyLocation,
    map: storyMap,
    icon: {
      url: "place.svg",
      anchor: new google.maps.Point(25,50),
      scaledSize: new google.maps.Size(50,50)
    }
  });
  /* here we control what happens when the user clicks on a marker.*/ 
  marker.addListener("click", () => {
    try{  
      /* if another window is already open, close it first*/ 
      currentStory.close() 
    }
    catch(e){  
      /* no window is open yet  so we don't need to do anything. */ 
    }
    /* open the infoWindow attached to this marker. */ 
    infoWindow.open(storyMap, marker);
    /* set the infoWindow as "currentStory"
     this will allow us to track it and close it on subsequent clicks. */
    currentStory = infoWindow; 
  });
  activeMarkers.push(marker);
}

// Note that "apikey" here is actually a URL. 
// it corresponds to an endpoint on which NodeJS is listening.
// After fetching the API Key from Node, the frontend will in turn fetch Google Maps.
fetch("apikey")
  .then(response => response.json())
  .then(data => {

    if (data.Status == "OK"){
      /* Now that we have an API Key for Google Maps, 
      We can generate a URL to fetch the Google Maps Javascript.
      We Include parameters for the Google API Key and callback function.
      After the script is loadeded, the callback function "initMap" will run. */  
      let url = 'https://maps.googleapis.com/maps/api/js'+
                  '?key='+data.GOOGLE_KEY+
                  '&callback=initMap';
      /* Add the Google Maps JavaScript to the page. */ 
      let script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    else{
      console.log(data);
    }
  })
  .catch(err => {
    console.error(err);
  });

function createMode() {
  console.log('this is createMode');
  /* Reset the text area to be blank initially. */
  createText.value = '';
  /* Set the position of the create map to match the storyMap. */ 
  pickerMap.setZoom(storyMap.getZoom());
  pickerMap.setCenter(storyMap.getCenter()); 
  pickerMarker.setPosition(storyMap.getCenter());
  /** Show and hide elements as needed */
  createButton.classList.add('active');
  mapButton.classList.remove('active'); 
  mapSection.style.display = "none"; 
  createSection.style.display = "block";
}
function mapMode() {
  console.log('this is mapMode');
  /** Show and hide elements as needed */
  createSection.style.display = "none"; 
  mapSection.style.display = "block";
  createButton.classList.remove('active');
  mapButton.classList.add('active');
}

createButton.addEventListener('click', () => createMode() )
mapButton.addEventListener('click', () => mapMode() )

goButton.addEventListener('click', () => {
  /* Get the location of the picker */ 
  let lat = pickerMarker.getPosition().lat()
  let lng = pickerMarker.getPosition().lng()  
  /* Send the story to NodeJS for insertion into Mongo.*/ 
  fetch('story', {
    "method" : "POST",
    "headers": {
      'Content-Type': 'application/json' 
    },
    "body": JSON.stringify({ 
      "content" : createText.value, 
      "location":{
        "type" : "Point",
        "coordinates" : [lng, lat] 
      } 
    })
  })
  .then(response => response.json())
  .then(json => {
    console.log(json)
    mapMode()
    refreshButton.click();
    // TODO, go back to the main map and refresh 
    // with the new story at the center.
  })
})

refreshButton.addEventListener('click', ()=>{
  // get center of map and run a new query. 
   
  activeMarkers.map(marker => marker.setMap(null) )
  activeMarkers= []; // reset to a blank array.  

  fetchStories({
    lat: storyMap.getCenter().lat(),
    lng: storyMap.getCenter().lng()
  })

  // Alternately you could query using the map's current bounds

})
 