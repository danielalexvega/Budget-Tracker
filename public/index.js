if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").then(reg => {
            console.log("We found your service worker file!", reg);
        });
    });
} else {
    console.log('Service Worker is not supported.');
}

let transactions = [];
let myChart;

function getData() {
    fetch("/api/transaction")
        .then(response => response.json())
        .then(data => {
            transactions = data;

            populateTotal();
            populateTable();
            populateChart();
        });
}

getData();


function populateTotal() {
    // reduce transaction amounts to a single total value
    let total = transactions.reduce((total, t) => {
        return total + parseInt(t.value);
    }, 0);

    let totalEl = document.querySelector("#total");
    totalEl.textContent = total;
}

function populateTable() {
    let tbody = document.querySelector("#tbody");
    tbody.innerHTML = "";

    transactions.forEach(transaction => {
        // create and populate a table row
        console.log(typeof transaction.date);
        let tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
      <td>${new Date(transaction.date).toLocaleDateString()}</td>
    `;

        tbody.appendChild(tr);
    });
}

function populateChart() {
    // copy array and reverse it
    let reversed = transactions.slice().reverse();
    let sum = 0;

    // create date labels for chart
    let labels = reversed.map(t => {
        let date = new Date(t.date);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    });

    // create incremental values for chart
    let data = reversed.map(t => {
        sum += parseInt(t.value);
        return sum;
    });

    // remove old chart if it exists
    if (myChart) {
        myChart.destroy();
    }

    let ctx = document.getElementById("myChart").getContext("2d");

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: "Total Over Time",
                fill: true,
                backgroundColor: "#0B2545",
                data
            }]
        }
    });
}

function sendTransaction(isAdding) {
    let nameEl = document.querySelector("#t-name");
    let amountEl = document.querySelector("#t-amount");
    let dateEl = document.querySelector("#t-date");
    let errorEl = document.querySelector(".form .error");

    // validate form
    if (nameEl.value === "" || amountEl.value === "") {
        errorEl.textContent = "Missing Information";
        errorEl.style.display = "block";
        return;
    }
    else {
        errorEl.textContent = "";
        errorEl.style.display = "none";
    }
    console.log(typeof dateEl.value);
    console.log(new Date().toISOString());

    // create record
    let transaction = {
        name: nameEl.value,
        value: amountEl.value,
        date: new Date(dateEl.value).toISOString()
    };

    // if subtracting funds, convert amount to negative number
    if (!isAdding) {
        transaction.value *= -1;
    }

    // add to beginning of current array of data
    transactions.unshift(transaction);

    // also send to server
    fetch("/api/transaction", {
        method: "POST",
        body: JSON.stringify(transaction),
        headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json"
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.errors) {
                errorEl.textContent = "Missing Information";
            }
            else {
                getData();
                // clear form
                nameEl.value = "";
                amountEl.value = "";
            }
        })
        .catch(err => {
            // fetch failed, so save in indexed db
            saveRecord(transaction);

            // clear form
            nameEl.value = "";
            amountEl.value = "";
        });
}

function clearAll() {
    fetch("/api/transaction", {
        method: "DELETE",
    })
        .then(() => {
            transactions = [];

            populateTotal();
            populateTable();
            populateChart();
        })
        .catch(err => {
            console.log(err);
        })
}

document.querySelector("#add-btn").onclick = function () {
    sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function () {
    sendTransaction(false);
};

document.querySelector("#clear-btn").onclick = () => {
    clearAll();
};
