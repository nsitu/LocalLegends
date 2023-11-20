/*
 This is the frontend of the Local Legends app. It runs in the browser.
 Fetches our Google API key from the backend (NodeJS)  
 Fetches and initializes Google Maps from Google. 
 Fetches stories from MongoDB via the backend (NodeJS) 
 Builds Info Windows for Stories. 
 Gives User tools to add a new story (GMaps + input form)
 Posts new stories to MongoDB via NodeJS
 */

/* 
NOTE: there are two instances of Google maps. 
1. Story Map - shows nearby stories
2. Picker Map - lets you choose a location for a new story
*/

 /* IMPORTANT: Explore the Google Maps documentation for further details and examples.
 https://developers.google.com/maps/documentation/javascript/examples/infoWindow-simple */

// Make it easier to manipulate dom elements
const $ = document.querySelector.bind(document)
  
let pickerMap             /* Map to choose a location */
let pickerMarker          /* A draggable map marker used to pick a location */
let storyMap              /* Map for stories. */ 
let storyBounds           /* an area on the map big enough to fit all stories. */ 
let currentStory          /* keep track of which info-window is currently open.*/
let activeMarkers = []    /* keep track of the stories currently on the map. */ 

/*  Function to initialize Google Maps 
Runs automatically via a callback after the Google Maps script loads. */
function initMap(){ 
  /* Here we ask the browser for the user's location.
  This involves a consent step. See also, MDN Documentation for the Geolocation API: 
  https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API */  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      // express user's location in a form that Google Maps will understand
      let userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
      }
      /* pass along the user's location to both maps */
     initializeStoryMap(userLocation)
     initializePickerMap(userLocation) 
    })
  } else{
    // if the device lacks the ability to geolocate, show an info message.
    $('body').innerHTML =
    `<main style="margin: 2rem auto; text-align: center;"> 
      <p><img src="/logo.svg" style="width:10rem;"></p>
      <p>Local Legends requires a location-aware browser. </p>
    </main> `;
  }
}

const initializeStoryMap = (userLocation) => { 
  // center the Google map on the user's location
  let storyMapOptions = {
    center: userLocation,
    disableDefaultUI: true
  }
  // make a new Google map to showing nearby stories.
  storyMap = new google.maps.Map(
    $('#storyMap'), 
    storyMapOptions
  ) 
  // the storyBounds get extended whenever we add a point. 
  // here we are adding the user's location to initialize the storyBounds
  fetchStories(userLocation) 
  // After the map tiles have finished loading,
  // Enable a Refresh button when Zooming or Panning
  google.maps.event.addListenerOnce(storyMap, 'tilesloaded', () => {
    google.maps.event.addListener(storyMap, 'zoom_changed', () => {
      $("#refreshButton").style.display = 'block' 
    })
    google.maps.event.addListener(storyMap, 'dragend', () => {
      $("#refreshButton").style.display = 'block' 
    }) 
  })
}

// the Picker map is used when creating a new story
// it allows us to pick a location for the new story.
const initializePickerMap = (userLocation) => { 
  // the picker should be centered on the user Location.
  let pickerMapOptions = {
    center: userLocation,
    zoom: 12,
    disableDefaultUI: true
  }
  // pickerMap will show UI for choosing a location for a new story
  pickerMap = new google.maps.Map(
    $('#pickerMap'), 
    pickerMapOptions
  )
  // make a new Google map for the purpose of picking a location
  pickerMarker = new google.maps.Marker({
      position: userLocation,
      map: pickerMap,
      icon: {
        url: "create.svg",
        anchor: new google.maps.Point(50,100),
        scaledSize: new google.maps.Size(100,100)
      },
      draggable: true 
  })
  // when dragging the marker, move the map to that spot
  google.maps.event.addListener(pickerMarker, 'dragend', (event) => {
    pickerMap.panTo( pickerMarker.getPosition() )
    console.log ( pickerMarker.getPosition())
  })
  // when clicking the map, set the picker to the clicked location
  google.maps.event.addListener(pickerMap, 'click',  (event) =>  {   
    pickerMarker.setPosition(event.latLng) 
    pickerMap.panTo( pickerMarker.getPosition() ) 
  })  
  //  When dragging the map, set the picker to the new map center.
  google.maps.event.addListener(pickerMap, 'dragend',  () =>  {   
    pickerMarker.setPosition(pickerMap.getCenter()) 
    pickerMap.panTo( pickerMarker.getPosition() ) 
  }) 
}

// =======================================

/* Send a POST request to the "stories" endpoint. 
send along the  user's location as query parameters
NodeJS will use this data to query MongoDB for Stories */ 
const fetchStories = (location) => {
  storyBounds = new google.maps.LatLngBounds()
  storyBounds.extend(location)  
  fetch(
    `/api/stories?lat=${location.lat}&lng=${location.lng}`, 
    { method: 'GET'}
  )
  .then(response => response.json())
  .then(stories => { 
    console.log(stories)
    for (story of stories) { 
      /* pass along each story to be mapped.*/ 
      mapStory( story )
    } 
    $("#refreshButton").style.display = 'none' 
  })
  .catch(err => { console.error(err)  })
}

/* Given a JSON object that describes a story, 
we are ready to add it to the map.*/
const mapStory = (story) => {
  /* Each story includes GPS coordinates.
  Here, we set up these coordinates in a way that Google understands. */ 
  let storyLocation = new google.maps.LatLng(
    story.location.coordinates[1],
    story.location.coordinates[0]
  )
  /* extend the storyBounds of the map to fit each new point */ 
  storyBounds.extend(storyLocation)
  storyMap.fitBounds(storyBounds)
  /* Make an "infoWindow" for each story. 
  This is like a bubble that appears when we click on a marker.
  You could modify this template to show a variety of details. */ 
  let infoWindow = new google.maps.InfoWindow({
    maxWidth: 300,
    content: `<p> ${story.content} </p>`
  })
  /* Markers are customizable with icons, etc.*/ 
  let marker = new google.maps.Marker({
    position: storyLocation,
    map: storyMap,
    icon: {
      url: "place.svg",
      anchor: new google.maps.Point(25,50),
      scaledSize: new google.maps.Size(50,50)
    }
  })
  /* here we control what happens when the user clicks on a marker.*/ 
  marker.addListener("click", () => { 
    /* if another window is already open, close it first*/ 
    try{   currentStory.close()   }
    catch(e){  /* no window is open. */  } 
    /* open the infoWindow attached to this marker. */ 
    infoWindow.open(storyMap, marker)

    /* set the infoWindow as "currentStory"
     this will allow us to track it and close it on subsequent clicks. */
    currentStory = infoWindow 
    
    // If you want to center the map on the current marker,
    // Uncomment the following line:
    // storyMap.setCenter(marker.position)
     
  })
  // add the new marker to an array of active markers
  activeMarkers.push(marker)
}
 
// ==============================
// Below we activate/deactivate user interfaces
// by showing and hiding elements on the page

// in create mode we see a picker map and a text input form
const createMode = () => {
  console.log('Switching to createMode')
  /* Reset the text area to be blank initially. */
  $('#createText').value = ''
  /* Set the position of the picker map to match the storyMap. */ 
  pickerMap.setZoom(storyMap.getZoom())
  pickerMap.setCenter(storyMap.getCenter()) 
  pickerMarker.setPosition(storyMap.getCenter())
  /** Show and hide elements as needed */ 
  $("#createButton").classList.add('active')
  $('#mapButton').classList.remove('active') 
  $('section#map').style.display = "none" 
  $("section#create").style.display = "block"
}

// in map mode we see a map populated with stories.
const mapMode = () => {
  console.log('Switching to mapMode')
  /** Show and hide elements as needed */
  $("section#create").style.display = "none" 
  $('section#map').style.display = "block"
  $("#createButton").classList.remove('active')
  $('#mapButton').classList.add('active')
}

// function to remove all the active markers
const resetMarkers = () =>{
  activeMarkers.map(marker => marker.setMap(null) )
  activeMarkers= [] // reset to a blank array.  
}

// event listeners for various buttons.
$("#createButton").addEventListener('click', () => createMode() )
$('#mapButton').addEventListener('click', () => mapMode() )
$("#submitButton").addEventListener('click', () => {
  /* Get the location of the picker */ 
  let lat = pickerMarker.getPosition().lat()
  let lng = pickerMarker.getPosition().lng()  
  /* Send the story to NodeJS for insertion into Mongo.*/ 
  fetch('/api/story', {
    "method" : "POST",
    "headers": {  'Content-Type': 'application/json' },
    "body": JSON.stringify({ 
      "content" : $('#createText').value, 
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
    resetMarkers()
    // after creating a new story, refresh the map 
    // populate it with content nearby to the new story.
    fetchStories({ lat: lat, lng: lng }) 
  })
}) 

// The refresh button clears the map and finds a new set of stories
// based on the current map center.
$("#refreshButton").addEventListener('click', ()=>{
  // get center of map and run a new query. 
  resetMarkers()
  fetchStories({
    lat: storyMap.getCenter().lat(),
    lng: storyMap.getCenter().lng()
  })
})
 
// Google maps doesn't play well In Replit's WebView iFrame, 
// therefore show a notice with a link to open a new tab instead.
if (window.frameElement){ 
  // note that the webview in Replit has a slightly different URL.
  // (It uses a doubledash instead of a dot)
  // The following line gives us the public URL that we would expect to see on a separate tab.
  // NOTE: this is a bit fragile, since Replit might chance this in the future.
  const url = window.location.href.replace('--','.') 
  newTab = () => window.open(url, '_blank')  
  $('body').innerHTML =`<main style="margin: 2rem auto; text-align: center;"> 
    <p><img src="/logo.svg" style="width:10rem;"></p>
    <p>Local Legends works best in a <a style="cursor:pointer; text-decoration: underline;" onclick="newTab()">separate tab</a>. 
    </p></main> `;
}
  
else{
// If we are in a separate tab, go ahead and load the map!

// Start by fetching the Google API Key from Node,
// afterwards the frontend will be able to fetch Google Maps.
// finally the "initMap" callback is triggered.
fetch("/api/apikey")
  .then(response => response.json())
  .then(data => { 
    if (data.Status == "OK"){
      /* Now that we have an API Key for Google Maps, 
      We can generate a URL to fetch the Google Maps Javascript.
      We Include parameters for the Google API Key and callback function.
      After the script is loadeded, the callback function "initMap" will run. */  
      let url = 'https://maps.googleapis.com/maps/api/js'+
                  '?key='+data.GOOGLE_KEY+
                  '&callback=initMap'
      /* Add the Google Maps JavaScript to the page. */ 
      let script = document.createElement('script')
      script.src = url
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    else{
      console.log(data)
    }
  })
  .catch(err => {
    console.error(err)
  }) 
}