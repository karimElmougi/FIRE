const MAX_RRSP_CONTRIBUTION = 24930;
const MAX_RRSP_PERCENTAGE = 0.18;
const MAX_TFSA_CONTRIBUTION = 5500;
const DEFAULT_ROI = 1.065;
const DEFAULT_RAISE = 1.025;
const DEFAULT_INFLATION = 1.02;
const DEFAULT_GOAL_MULTIPLIER = 30;

const withdrawRate = 1 / (DEFAULT_GOAL_MULTIPLIER - 5);

const salaryInput = $("#salary_input");
const colInput = $("#col_input");
const retirementColInput = $("#retirement_col_input");
const assetsInput = $("#assets_input");
const roiInput = $("#roi_input");
const raisesInput = $("#raises_input");
const inflationInput = $("#inflation_input");
const estimateButton = $("#estimateButton");

const yearsToFI = $("#yearsToFI");
const assets = $("#assets");
const annualFIIncome = $("#annualFIIncome");
const annualExpenses = $("#annualExpenses");

function startingSalary(): number {
    return Number(salaryInput.val());
}

function startingAssets(): number {
    return Number(assetsInput.val());
}

function roi(): number {
    return Number(roiInput.val());
}

function inflationRate(): number {
    return Number(inflationInput.val());
}

function startingCol(): number {
    return Number(colInput.val());
}

function retirementCol(): number {
    return Number(retirementColInput.val());
}

function annualRaise(): number {
    return Number(raisesInput.val());
}

class AnnualData {
    currentYear: number;
    currentSalary: number;
    rrspContribution: number;
    taxableIncome: number;
    netIncome: number;
    col: number;
    tfsaContribution: number;
    unregisteredContribution: number;
    rrspAssets: number;
    tfsaAssets: number;
    unregisteredAssets: number;
    totalAssets: number;
    retirementCol: number;
    goal: number;
    goalDifference: number;
    retirementIncome: number;


    constructor() {
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

    static calculateNextYear(previousYear: AnnualData): AnnualData {
        let nextYear = new AnnualData();

        nextYear.currentYear = previousYear.currentYear + 1;
        nextYear.currentSalary = startingSalary() * Math.pow(annualRaise(), previousYear.currentYear - 1);
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
    }

    static netIncome(grossIncome, year, inflation): number {
        let taxes = 0;
        let tempIncome = grossIncome;
        let provincialBrackets = [
            [11327, 41935 * Math.pow(inflation, year - 1), 83865 * Math.pow(inflation, year - 1), 102040 * Math.pow(inflation, year - 1), 999999],
            [0.0, 0.16, 0.2, 0.24, 0.2575]
        ];
        let federalBrackets = [
            [11327, 44701 * Math.pow(inflation, year - 1), 89401 * Math.pow(inflation, year - 1), 138586 * Math.pow(inflation, year - 1), 999999],
            [0.0, 0.15, 0.22, 0.26, 0.29]
        ];

        for (let i = provincialBrackets[0].length - 2; i >= 0; i--) {
            if (tempIncome > provincialBrackets[0][i] && tempIncome < provincialBrackets[0][i + 1]) {
                taxes += provincialBrackets[1][i + 1] * (tempIncome - provincialBrackets[0][i]);
                tempIncome = provincialBrackets[0][i] - 1;
            }
        }

        tempIncome = grossIncome;
        for (let i = federalBrackets[0].length - 2; i >= 0; i--) {
            if (tempIncome > federalBrackets[0][i] && tempIncome < federalBrackets[0][i + 1]) {
                taxes += federalBrackets[1][i + 1] * (tempIncome - federalBrackets[0][i]);
                tempIncome = federalBrackets[0][i] - 1;
            }
        }

        return (grossIncome - taxes);
    }

    static generateHeader(): string[] {
        return [
            "Year", "Gross Salary", "Taxable Income", "RRSP Contribution", "TFSA Contribution", "Cost of Living", "Leftover",
            "RRSP Assets", "TFSA Assets", "Unregistered Assets", "Total Assets", "Goal", "Difference", "Retirement Income"
        ];
    }

    generateData(): number[]{
        return [
            this.currentYear, this.currentSalary, this.taxableIncome, this.rrspContribution, this.tfsaContribution, this.col,
            this.unregisteredContribution, this.rrspAssets, this.tfsaAssets, this.unregisteredAssets, this.totalAssets, this.goal,
            this.goalDifference, this.retirementCol
        ];
    }
}

estimateButton.click(function () {
    Estimate();
});

function Estimate() {
    let years = [new AnnualData()];
    let retirementYear;
    for (let i = 0; i < 45; i++) {
        let yearToAdd = AnnualData.calculateNextYear(years[i]);
        if(retirementYear === undefined && yearToAdd.goalDifference > 0){
            retirementYear = yearToAdd
        }
        years.push(yearToAdd);
    }
    yearsToFI.html(retirementYear.currentYear.toString()+"&nbsp;years");
    assets.text(toFormattedString(retirementYear.totalAssets));
    annualFIIncome.text(toFormattedString(retirementYear.retirementIncome));
    annualExpenses.text(toFormattedString(retirementYear.retirementCol));
    createTable(years);
}

function createTable(tableData) {
    let table = document.createElement('table');
    let tableHeader = document.createElement('thead');
    let headerRow = document.createElement('tr');

    AnnualData.generateHeader().forEach(function(headerItem: string){ appendToRow(headerRow, headerItem) });

    tableHeader.appendChild(headerRow);
    table.appendChild(tableHeader);
    let tableBody = document.createElement('tbody');

    tableData.forEach(function (year: AnnualData) {
        let row = document.createElement('tr');

        year.generateData().forEach(function(value){ appendToRow(row, toFormattedString(value)) });

        tableBody.appendChild(row);
    });

    table.appendChild(tableBody);
    document.body.appendChild(table);
    $("table").attr("border", "1");
}

function toFormattedString(value: number): string {
    return value.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function appendToRow(row, value: string): void {
    row.appendChild(function () {
        let x = document.createElement('th');
        x.appendChild(document.createTextNode(value));
        return x;
    }());
}
