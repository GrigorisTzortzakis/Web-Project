document.addEventListener("DOMContentLoaded", function() {
    var map = L.map('mapid').setView([38.246242, 21.735085], 13);


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Define icons for different marker types
    const icons = {
        base: L.icon({ iconUrl: '/images/base_icon.png', iconSize: [32, 32] }),
        vehicle: L.icon({ iconUrl: '/images/vehicle_icon.png', iconSize: [32, 32] }),
        requestPending: L.icon({ iconUrl: '/images/request_pending_icon.png', iconSize: [32, 32] }),
        requestInProgress: L.icon({ iconUrl: '/images/request_in_progress_icon.png', iconSize: [32, 32] }),
        offerPending: L.icon({ iconUrl: '/images/offer_pending_icon.png', iconSize: [32, 32] }),
        offerInProgress: L.icon({ iconUrl: '/images/offer_in_progress_icon.png', iconSize: [32, 32] })
    };

    // Create layer groups for filtering
    const layers = {
        bases: L.layerGroup(),
        vehiclesWithTasks: L.layerGroup(),
        vehiclesWithoutTasks: L.layerGroup(),
        requestsPending: L.layerGroup(),
        requestsUndertaken: L.layerGroup(),
        offersPending: L.layerGroup(),
        offersUndertaken: L.layerGroup(),
    };

    // Add all layers to the map
    Object.values(layers).forEach(layer => map.addLayer(layer));

    function addMarker(item, layer, icon) {
        const marker = L.marker([item.latitude, item.longitude], { icon: icon }).addTo(layers[layer]);
        marker.bindPopup(createPopupContent(item));
        return marker;
    }

    function createPopupContent(item) {
        let content = `<b>${item.type}</b><br>`;
        if (item.type === 'base') {
            content += `Base: ${item.name}`;
        } else if (item.type === 'vehicle') {
            content += `Username: ${item.username}<br>
                        Load: ${item.load}<br>
                        Status: ${item.status}`;
            if (item.activeTasks && item.activeTasks.length > 0) {
                content += `<br>Active Tasks:<br>`;
                item.activeTasks.forEach(task => {
                    content += `- ${task.type}: ${task.item} (${task.quantity})<br>`;
                });
            }
        } else if (item.type === 'request' || item.type === 'offer') {
            content += `Name: ${item.name}<br>
                        Phone: ${item.phone}<br>
                        Date: ${item.date}<br>
                        Item: ${item.item}<br>
                        Quantity: ${item.quantity}<br>
                        Status: ${item.status}`;
            if (item.vehicle) {
                content += `<br>Assigned to: ${item.vehicle}`;
                if (item.type === 'request' && item.collection_date) {
                    content += `<br>Collection Date: ${item.collection_date}`;
                } else if (item.type === 'offer' && item.withdrawal_date) {
                    content += `<br>Withdrawal Date: ${item.withdrawal_date}`;
                }
            }
        }

        return content;

    }


    let taskLines = L.layerGroup().addTo(map);

    function drawTaskLines(vehicle) {
        if (vehicle.request_tasks) {
            const requests = vehicle.request_tasks.split(';').map(task => {
                const [id, lat, lng] = task.split(',');
                return { id, latitude: parseFloat(lat), longitude: parseFloat(lng) };
            });
            requests.forEach(request => {
                L.polyline([
                    [vehicle.latitude, vehicle.longitude],
                    [request.latitude, request.longitude]
                ], { color: 'red', weight: 2, opacity: 0.5 }).addTo(taskLines);
            });
        }

        if (vehicle.offer_tasks) {
            const offers = vehicle.offer_tasks.split(';').map(task => {
                const [id, lat, lng] = task.split(',');
                return { id, latitude: parseFloat(lat), longitude: parseFloat(lng) };
            });
            offers.forEach(offer => {
                L.polyline([
                    [vehicle.latitude, vehicle.longitude],
                    [offer.latitude, offer.longitude]
                ], { color: 'blue', weight: 2, opacity: 0.5 }).addTo(taskLines);
            });
        }
    }

    function updateMap(data) {
        // Clear existing layers
        Object.values(layers).forEach(layer => layer.clearLayers());
        taskLines.clearLayers();

        // Add bases
        data.bases.forEach(base => {
            base.type = 'base';
            const marker = addMarker(base, 'bases', icons.base);
            marker.dragging.enable();
            marker.on('dragend', function(event) {
                const position = marker.getLatLng();
                if (confirm(`Do you want to update the base location to ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}?`)) {
                    updateBaseLocation(base.id, position.lat, position.lng);
                } else {
                    marker.setLatLng([base.latitude, base.longitude]);
                }
            });
        });

        // Add vehicles
        // Add vehicles
        data.vehicles.forEach(vehicle => {
            vehicle.type = 'vehicle';
            const layer = (vehicle.request_tasks || vehicle.offer_tasks) ? 'vehiclesWithTasks' : 'vehiclesWithoutTasks';
            const marker = addMarker(vehicle, layer, icons.vehicle);
            drawTaskLines(vehicle);
        });

        // Add requests
        data.requests.forEach(request => {
            request.type = 'request';
            const layer = request.status === 'pending' ? 'requestsPending' : 'requestsUndertaken';
            const icon = request.status === 'pending' ? icons.requestPending : icons.requestInProgress;
            addMarker(request, layer, icon);
        });

        // Add offers
        data.offers.forEach(offer => {
            offer.type = 'offer';
            const layer = offer.status === 'pending' ? 'offersPending' : 'offersUndertaken';
            const icon = offer.status === 'pending' ? icons.offerPending : icons.offerInProgress;
            addMarker(offer, layer, icon);
        });
    }

    function updateBaseLocation(baseId, lat, lng) {
        fetch(`/api/mapdata/bases/${baseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude: lat, longitude: lng })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('Base location updated:', data);
            })
            .catch(error => console.error('Error updating base location:', error));
    }

    function fetchMapData() {
        // Show loading indicator
        showLoading();

        fetch('/api/mapdata')
            .then(response => response.json())
            .then(data => {
                console.log('Raw map data received:', data);
                if (data && typeof data === 'object') {
                    console.log('Data structure:', Object.keys(data));
                    console.log('Bases:', data.bases);
                    console.log('Vehicles:', data.vehicles);
                    console.log('Requests:', data.requests);
                    console.log('Offers:', data.offers);
                    updateMap(data);
                } else {
                    console.error('Invalid data structure received from server');
                }
            })
            .catch(error => console.error('Error fetching map data:', error))
            .finally(() => {
                // Hide loading indicator
                hideLoading();
            });
    }
    function showLoading() {
        // You can implement this to show a loading spinner or message
        console.log('Loading...');
    }

    // Function to hide loading indicator
    function hideLoading() {
        // You can implement this to hide the loading spinner or message
        console.log('Loading complete');
    }
    fetchMapData();
    // Refresh map data every 30 seconds
    setInterval(fetchMapData, 30000);

    L.Control.RefreshButton = L.Control.extend({
        onAdd: function(map) {
            var button = L.DomUtil.create('button', 'refresh-button');
            button.innerHTML = '🔄 Refresh';
            button.style.padding = '5px 10px';
            button.style.fontSize = '14px';
            button.style.cursor = 'pointer';

            L.DomEvent.on(button, 'click', function() {
                fetchMapData();
            });

            return button;
        }
    });

    // Add the custom refresh control to the map
    new L.Control.RefreshButton({ position: 'topright' }).addTo(map);

    // Add layer control for filtering
    const overlays = {
        "Bases": layers.bases,
        "Vehicles with Tasks": layers.vehiclesWithTasks,
        "Vehicles without Tasks": layers.vehiclesWithoutTasks,
        "Pending Requests": layers.requestsPending,
        "Undertaken Requests": layers.requestsUndertaken,
        "Pending Offers": layers.offersPending,
        "Undertaken Offers": layers.offersUndertaken,
        "Task Lines": taskLines
    };

    L.control.layers(null, overlays, { position: 'topright' }).addTo(map);
    window.assignTask = function(vehicleId) {
        const taskId = prompt("Enter task ID:");
        const taskType = prompt("Enter task type (request/offer):");
        if (taskId && taskType) {
            fetch('/api/task-assignment/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId, taskId, taskType })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert("Task assigned successfully!");
                        fetchMapData(); // Refresh the map
                    } else {
                        alert("Failed to assign task.");
                    }
                })
                .catch(error => console.error('Error:', error));
        }
    }

    window.assignVehicle = function(taskType, taskId) {
        const vehicleId = prompt("Enter vehicle ID:");
        if (vehicleId) {
            fetch('/api/task-assignment/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId, taskId, taskType })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert("Vehicle assigned successfully!");
                        fetchMapData(); // Refresh the map
                    } else {
                        alert("Failed to assign vehicle.");
                    }
                })
                .catch(error => console.error('Error:', error));
        }
    }
});
function assignTaskToVehicle(vehicleId, taskId, taskType) {
    fetch('/api/mapdata/assign-task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicleId, taskId, taskType }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert('Task assigned successfully');
                fetchMapData(); // Refresh the map data
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while assigning the task');
        });
}

