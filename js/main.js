var MAX_RRSP_CONTRIBUTION = 24930;
var MAX_RRSP_PERCENTAGE = 0.18;
var MAX_TFSA_CONTRIBUTION = 5500;
var DEFAULT_ROI = 1.065;
var DEFAULT_RAISE = 1.025;
var DEFAULT_INFLATION = 1.02;
var DEFAULT_GOAL_MULTIPLIER = 30;
var withdrawRate = 1 / (DEFAULT_GOAL_MULTIPLIER - 5);
var salaryInput = $("#salary_input");
var colInput = $("#col_input");
var retirementColInput = $("#retirement_col_input");
var assetsInput = $("#assets_input");
var roiInput = $("#roi_input");
var raisesInput = $("#raises_input");
var inflationInput = $("#inflation_input");
var estimateButton = $("#estimateButton");
var detailsButton = $("#detailsButton");
var yearsToFI = $("#yearsToFI");
var assets = $("#assets");
var annualFIIncome = $("#annualFIIncome");
var annualExpenses = $("#annualExpenses");
var resultsDiv = $("#bigNumbers");
function startingSalary() {
    return Number(salaryInput.val());
}
function startingAssets() {
    return Number(assetsInput.val());
}
function roi() {
    return Number(roiInput.val());
}
function inflationRate() {
    return Number(inflationInput.val());
}
function startingCol() {
    return Number(colInput.val());
}
function retirementCol() {
    return Number(retirementColInput.val());
}
function annualRaise() {
    return Number(raisesInput.val());
}
var AnnualData = (function () {
    function AnnualData() {
        this.currentYear = 1;
        this.currentSalary = startingSalary();
        this.rrspContribution = Math.min(MAX_RRSP_PERCENTAGE * this.currentSalary, MAX_RRSP_CONTRIBUTION);
        this.taxableIncome = this.currentSalary - this.rrspContribution + startingAssets() * roi();
        this.netIncome = AnnualData.netIncome(this.taxableIncome, 1, inflationRate());
        this.col = startingCol();
        this.tfsaContribution = Math.max(Math.min(this.netIncome - this.col, MAX_TFSA_CONTRIBUTION), 0);
        this.unregisteredContribution = Math.max(this.netIncome - this.col - this.tfsaContribution, 0);
        this.rrspAssets = this.rrspContribution;
        this.tfsaAssets = this.tfsaContribution;
        this.unregisteredAssets = this.unregisteredContribution;
        this.totalAssets = this.rrspAssets + this.tfsaAssets + this.unregisteredAssets;
        this.retirementCol = retirementCol();
        this.goal = DEFAULT_GOAL_MULTIPLIER * this.retirementCol;
        this.goalDifference = this.totalAssets - this.goal;
        this.retirementIncome = withdrawRate * this.tfsaAssets + AnnualData.netIncome(withdrawRate * (this.rrspAssets + this.unregisteredAssets), 1, inflationRate());
    }
    AnnualData.calculateNextYear = function (previousYear) {
        var nextYear = new AnnualData();
        nextYear.currentYear = previousYear.currentYear + 1;
        nextYear.currentSalary = startingSalary() * Math.pow(annualRaise(), previousYear.currentYear);
        nextYear.rrspContribution = Math.min(MAX_RRSP_PERCENTAGE * nextYear.currentSalary, MAX_RRSP_CONTRIBUTION);
        nextYear.taxableIncome = nextYear.currentSalary - nextYear.rrspContribution + previousYear.unregisteredAssets * (roi() - 1);
        nextYear.netIncome = AnnualData.netIncome(nextYear.taxableIncome, nextYear.currentYear, inflationRate());
        nextYear.col = startingCol() * Math.pow(inflationRate(), nextYear.currentYear - 1);
        nextYear.tfsaContribution = Math.max(Math.min(nextYear.netIncome - nextYear.col, MAX_TFSA_CONTRIBUTION), 0);
        nextYear.unregisteredContribution = Math.max(nextYear.netIncome - nextYear.col - nextYear.tfsaContribution, 0);
        nextYear.rrspAssets = previousYear.rrspAssets * roi() + nextYear.rrspContribution;
        nextYear.tfsaAssets = previousYear.tfsaAssets * roi() + nextYear.tfsaContribution;
        nextYear.unregisteredAssets = previousYear.unregisteredAssets + nextYear.unregisteredContribution;
        nextYear.totalAssets = nextYear.rrspAssets + nextYear.tfsaAssets + nextYear.unregisteredAssets;
        nextYear.retirementCol = previousYear.retirementCol * inflationRate();
        nextYear.goal = DEFAULT_GOAL_MULTIPLIER * nextYear.retirementCol;
        nextYear.goalDifference = nextYear.totalAssets - nextYear.goal;
        nextYear.retirementIncome = withdrawRate * nextYear.tfsaAssets + AnnualData.netIncome(withdrawRate * (nextYear.rrspAssets + nextYear.unregisteredAssets), 1, inflationRate());
        return nextYear;
    };
    AnnualData.netIncome = function (grossIncome, year, inflation) {
        var taxes = 0;
        var tempIncome = grossIncome;
        var provincialBrackets = [
            [11327, 41935 * Math.pow(inflation, year - 1), 83865 * Math.pow(inflation, year - 1), 102040 * Math.pow(inflation, year - 1), 999999],
            [0.0, 0.16, 0.2, 0.24, 0.2575]
        ];
        var federalBrackets = [
            [11327, 44701 * Math.pow(inflation, year - 1), 89401 * Math.pow(inflation, year - 1), 138586 * Math.pow(inflation, year - 1), 999999],
            [0.0, 0.15, 0.22, 0.26, 0.29]
        ];
        for (var i = provincialBrackets[0].length - 2; i >= 0; i--) {
            if (tempIncome > provincialBrackets[0][i] && tempIncome < provincialBrackets[0][i + 1]) {
                taxes += provincialBrackets[1][i + 1] * (tempIncome - provincialBrackets[0][i]);
                tempIncome = provincialBrackets[0][i] - 1;
            }
        }
        tempIncome = grossIncome;
        for (var i = federalBrackets[0].length - 2; i >= 0; i--) {
            if (tempIncome > federalBrackets[0][i] && tempIncome < federalBrackets[0][i + 1]) {
                taxes += federalBrackets[1][i + 1] * (tempIncome - federalBrackets[0][i]);
                tempIncome = federalBrackets[0][i] - 1;
            }
        }
        return (grossIncome - taxes);
    };
    AnnualData.generateHeader = function () {
        return [
            "Year", "Gross Salary", "Taxable Income", "RRSP Contribution", "TFSA Contribution", "Cost of Living", "Leftover",
            "RRSP Assets", "TFSA Assets", "Unregistered Assets", "Total Assets", "Goal", "Difference", "Retirement Income"
        ];
    };
    AnnualData.prototype.generateData = function () {
        return [
            this.currentYear, this.currentSalary, this.taxableIncome, this.rrspContribution, this.tfsaContribution, this.col,
            this.unregisteredContribution, this.rrspAssets, this.tfsaAssets, this.unregisteredAssets, this.totalAssets, this.goal,
            this.goalDifference, this.retirementCol
        ];
    };
    return AnnualData;
}());
estimateButton.click(function () {
    Estimate();
    resultsDiv.removeClass("hidden");
});
detailsButton.click(function () {
    $("table").removeClass("hidden");
});
var years;
function Estimate() {
    years = [new AnnualData()];
    var retirementYear;
    for (var i = 0; i < 45; i++) {
        var yearToAdd = AnnualData.calculateNextYear(years[i]);
        if (retirementYear === undefined && yearToAdd.goalDifference > 0) {
            retirementYear = yearToAdd;
        }
        years.push(yearToAdd);
    }
    yearsToFI.html(retirementYear.currentYear.toString() + "&nbsp;years");
    assets.text(toFormattedString(retirementYear.totalAssets));
    annualFIIncome.text(toFormattedString(retirementYear.retirementIncome));
    annualExpenses.text(toFormattedString(retirementYear.retirementCol));
    if ($("table").length !== 0) {
        $("table").remove();
    }
    createTable(years);
}
function createTable(tableData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var headerRow = document.createElement('tr');
    AnnualData.generateHeader().forEach(function (headerItem) { appendToRow(headerRow, headerItem); });
    tableHeader.appendChild(headerRow);
    table.appendChild(tableHeader);
    var tableBody = document.createElement('tbody');
    tableData.forEach(function (year) {
        var row = document.createElement('tr');
        year.generateData().forEach(function (value) { appendToRow(row, toFormattedString(value)); });
        tableBody.appendChild(row);
    });
    table.appendChild(tableBody);
    document.body.appendChild(table);
    $("table").attr("border", "1");
    $("table").addClass("hidden");
}
function toFormattedString(value) {
    return value.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function appendToRow(row, value) {
    row.appendChild(function () {
        var x = document.createElement('th');
        x.appendChild(document.createTextNode(value));
        return x;
    }());
}
