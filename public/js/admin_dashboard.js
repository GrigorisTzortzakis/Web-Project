document.addEventListener('DOMContentLoaded', () => {
    const itemForm = document.getElementById('itemForm');
    const itemCategory = document.getElementById('itemCategory');
    const categoryForm = document.getElementById('categoryForm');
    const categoryList = document.getElementById('categoryList');
    const logoutButton = document.getElementById('logoutButton'); // Add this line
    const warehouseList = document.getElementById('warehouseList');

    const categoryNicknames = {
        10: '',
        13: '-----',
        9: '2d hacker',
        49: 'Animal Care',
        29: 'Animal Food',
        25: 'Baby Essentials',
        6: 'Beverages',
        59: 'Books',
        22: 'Cleaning Supplies',
        33: 'Cleaning Supplies.',
        7: 'Clothing',
        53: 'Clothing and cover',
        28: 'Cold weather',
        45: 'Communication items',
        46: 'communications',
        44: 'Disability and Assistance Items',
        50: 'Earthquake Safety',
        27: 'Electronic Devices',
        43: 'Energy Drinks',
        30: 'Financial support',
        35: 'First Aid',
        14: 'Flood',
        5: 'Food',
        60: 'Fuel and Energy',
        8: 'Hacker of class',
        34: 'Hot Weather',
        57: 'Household Items',
        47: 'Humanitarian Shelters',
        26: 'Insect Repellents',
        24: 'Kitchen Supplies',
        16: 'Medical Supplies',
        52: 'Navigation Tools',
        15: 'new cat',
        21: 'Personal Hygiene ',
        41: 'pet supplies',
        19: 'Shoes',
        51: 'Sleep Essentilals',
        56: 'Special items',
        11: 'Test',
        61: 'test category',
        40: 'test1',
        39: 'Test_0',
        23: 'Tools',
        54: 'Tools and Equipment',
        48: 'Water Purification',
        42: 'Μedicines'
    };

    function loadCategories() {
        fetch('/api/categories')
            .then(response => response.json())
            .then(data => {
                itemCategory.innerHTML = '';
                categoryList.innerHTML = '';
                data.forEach(category => {
                    const categoryName = categoryNicknames[category.id] || category.name;

                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = categoryName;
                    itemCategory.appendChild(option);

                    const div = document.createElement('div');
                    div.className = 'category';
                    div.innerHTML = `
                        <span>${categoryName}</span>
                        <button class="delete-category" data-id="${category.id}">Delete Category</button>
                    `;
                    div.addEventListener('click', (event) => {
                        if (event.target.classList.contains('delete-category')) {
                            deleteCategory(event);
                        } else {
                            toggleCategoryItems(category.id);
                        }
                    });
                    categoryList.appendChild(div);

                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'item-container';
                    itemContainer.id = `category-${category.id}`;
                    itemContainer.style.display = 'none';
                    categoryList.appendChild(itemContainer);
                });
            })
            .then(loadItems) // Ensure items are loaded after categories
            .catch(error => console.error('Error fetching categories:', error));
    }

    categoryForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const categoryName = document.getElementById('categoryName').value;

        fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: categoryName })
        })
            .then(response => response.json())
            .then(data => {
                console.log('Category added successfully:', data);
                loadCategories();
            })
            .catch(error => {
                console.error('Error adding category:', error);
            });
    });

    itemForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const itemName = document.getElementById('itemName').value;
        const itemQuantity = document.getElementById('itemQuantity').value;
        const itemCategoryValue = itemCategory.value;

        const itemData = {
            name: itemName,
            category_id: itemCategoryValue,
            quantity: itemQuantity
        };

        fetch('/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        })
            .then(response => response.json())
            .then(data => {
                console.log('Item added successfully:', data);
                loadItems();
            })
            .catch(error => console.error('Error adding item:', error));
    });

    function loadItems() {
        fetch('/api/items')
            .then(response => response.json())
            .then(data => {
                const itemsByCategory = data.reduce((acc, item) => {
                    acc[item.category_id] = acc[item.category_id] || [];
                    acc[item.category_id].push(item);
                    return acc;
                }, {});

                // Get all category containers
                const allCategoryContainers = document.querySelectorAll('.item-container');

                // Hide all category containers initially
                allCategoryContainers.forEach(container => {
                    container.style.display = 'none';
                    container.innerHTML = 'Empty';
                });

                for (const [category, items] of Object.entries(itemsByCategory)) {
                    const itemContainer = document.getElementById(`category-${category}`);
                    if (itemContainer) {
                        itemContainer.innerHTML = '';

                        items.forEach(item => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'item';

                            const details = item.details && item.details.length > 0
                                ? item.details.map(detail => `${detail.detail_name}: ${detail.detail_value}`).join(', ')
                                : 'No details available';

                            itemDiv.innerHTML = `
                            ${item.name} Quantity: <input type="number" class="item-quantity" data-id="${item.id}" value="${item.quantity}"> - ${details}
                            <button class="update-quantity" data-id="${item.id}">Update</button>
                            <button class="delete-item" data-id="${item.id}">Delete</button>
                        `;
                            itemContainer.appendChild(itemDiv);
                        });

                        if (items.length > 0) {
                            itemContainer.style.display = 'block';
                        }
                    }
                }

                // Add event listeners for update and delete buttons
                document.querySelectorAll('.update-quantity').forEach(button => {
                    button.addEventListener('click', updateItemQuantity);
                });

                document.querySelectorAll('.delete-item').forEach(button => {
                    button.addEventListener('click', deleteItem);
                });
            })
            .catch(error => console.error('Error fetching items:', error));
    }

    function updateItemQuantity(event) {
        const itemId = event.target.getAttribute('data-id');
        const itemQuantityInput = document.querySelector(`.item-quantity[data-id="${itemId}"]`);
        const newQuantity = itemQuantityInput.value;

        fetch(`/api/items/${itemId}/quantity`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity: newQuantity })
        })
            .then(response => response.json())
            .then(data => {
                console.log('Item quantity updated successfully:', data);
                loadItems(); // Refresh the items list
            })
            .catch(error => console.error('Error updating item quantity:', error));
    }

    function deleteItem(event) {
        const itemId = event.target.getAttribute('data-id');

        fetch(`/api/items/${itemId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                console.log('Item deleted successfully:', data);

                // Find the item element
                const itemElement = document.querySelector(`button.delete-item[data-id="${itemId}"]`).closest('.item');

                if (itemElement) {
                    const categoryContainer = itemElement.closest('.item-container');
                    itemElement.remove(); // Remove the item from the DOM

                    if (categoryContainer) {
                        // Check if the category is now empty
                        if (categoryContainer.children.length === 0) {
                            categoryContainer.innerHTML = 'Empty';
                            categoryContainer.style.display = 'none';
                        }
                    }
                }

                // Optionally, you can refresh the entire item list to ensure consistency
                loadItems();
            })
            .catch(error => {
                console.error('Error deleting item:', error);
                // Optionally, show an error message to the user
                alert('Failed to delete item. Please try again.');
            });
    }

    function deleteCategory(event) {
        const categoryId = event.target.getAttribute('data-id');

        fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                console.log('Category deleted successfully:', data);
                const categoryElement = document.querySelector(`button.delete-category[data-id="${categoryId}"]`).parentElement;
                const itemContainer = document.getElementById(`category-${categoryId}`);
                categoryElement.remove(); // Remove the category from the DOM
                itemContainer.remove(); // Remove the items container from the DOM
            })
            .catch(error => console.error('Error deleting category:', error));
    }

    function toggleCategoryItems(categoryId) {
        const itemContainer = document.getElementById(`category-${categoryId}`);
        if (itemContainer) {
            itemContainer.style.display = itemContainer.style.display === 'none' ? 'block' : 'none';
        }
    }

    loadCategories();

    document.getElementById('uploadForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData();
        const fileInput = document.getElementById('jsonFile');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file');
            return;
        }

        console.log('File selected:', file.name); // Log the selected file

        formData.append('jsonFile', file);

        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                console.log('Response received:', response.status); // Log the response status
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data); // Log the response data
                if (data.message === 'Database populated successfully from file') {
                    alert('File uploaded and database populated successfully');
                    loadCategories(); // Reload categories, which will also call loadItems
                } else {
                    alert('Error uploading file: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to upload file');
            });
    });

    document.getElementById('clearFileButton').addEventListener('click', function() {
        const fileInput = document.getElementById('jsonFile');
        fileInput.value = ''; // Clear the file input
        console.log('File input cleared'); // Log the file input clear action
    });

    document.getElementById('loadFromUrlButton').addEventListener('click', function() {
        fetch('/api/populate')
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Database populated successfully') {
                    alert('Data loaded successfully from URL');
                    loadCategories(); // Reload categories, which will also call loadItems
                } else {
                    alert('Error loading data from URL');
                }
            })
            .catch(error => console.error('Error:', error));
    });

    logoutButton.addEventListener('click', function() {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/login.html';
                } else {
                    alert('Logout failed');
                }
            })
            .catch(error => console.error('Error logging out:', error));
    });
});
