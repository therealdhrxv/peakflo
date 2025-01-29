"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const categories = {
    "Green-Green": { peak: 2, nonPeak: 1, dailyCap: 8, weeklyCap: 55 },
    "Red-Red": { peak: 3, nonPeak: 2, dailyCap: 12, weeklyCap: 70 },
    "Green-Red": { peak: 4, nonPeak: 3, dailyCap: 15, weeklyCap: 90 },
    "Red-Green": { peak: 3, nonPeak: 2, dailyCap: 15, weeklyCap: 90 },
};
function getISOWeek(dt) {
    const date = new Date(dt.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7));
    const diff = date.getTime() - week1.getTime();
    return [week1.getFullYear(), Math.ceil(diff / 604800000) + 1];
}
function isPeak(dt) {
    const day = dt.getDay();
    const hours = dt.getHours();
    const minutes = dt.getMinutes();
    const time = hours * 100 + minutes;
    console.log(`day is: ${day} & hour is: ${hours} & min is: ${minutes} & time is: ${time}`);
    if (day >= 1 && day <= 5) {
        return ((time >= 800 && time < 1000) || (time >= 1630 && time < 1900) // mon - fri: 8:00 to 10:00, 16:30 to 19:00
        );
    }
    else if (day === 6) {
        return ((time >= 1000 && time < 1400) || (time >= 1800 && time < 2300) // sat - 10:00 to 14:00, 18:00 to 23:00
        );
    }
    else if (day === 0) {
        return time >= 1800 && time < 2300; // sun - 18:00 to 23:00
    }
    return false;
}
function extractCategoryKey(key) {
    return key.split('-').slice(0, 2).join('-'); // "Green-Green-2021-03-24"  =>  "Green-Green"
}
function calculateTotalFare(csvRows) {
    // daily sums
    const dailySums = {};
    for (const [fromLine, toLine, dtStr] of csvRows) {
        const dt = new Date(dtStr);
        const dateKey = dt.toISOString().split("T")[0];
        const categoryKey = `${fromLine}-${toLine}`;
        const category = categories[categoryKey];
        if (!category)
            throw new Error(`Invalid category: ${categoryKey}`);
        const fare = isPeak(dt) ? category.peak : category.nonPeak;
        const dailyKey = `${categoryKey}-${dateKey}`;
        dailySums[dailyKey] = (dailySums[dailyKey] || 0) + fare;
    }
    // daily caps
    const dailyCapped = {};
    for (const [key, sum] of Object.entries(dailySums)) {
        dailyCapped[key] = Math.min(sum, categories[extractCategoryKey(key)].dailyCap);
    }
    // weekly sums
    const weeklySums = {};
    for (const [key, capped] of Object.entries(dailyCapped)) {
        const dateStr = key.split("-").slice(2).join("-"); // 'Green-Green-2021-03-24'  =>  '2021-03-24'
        const [year, week] = getISOWeek(new Date(dateStr));
        const weeklyKey = `${extractCategoryKey(key)}-${year}-${week}`;
        weeklySums[weeklyKey] = (weeklySums[weeklyKey] || 0) + capped;
    }
    // weekly caps and total
    let total = 0;
    for (const [weeklyKey, sum] of Object.entries(weeklySums)) {
        total += Math.min(sum, categories[extractCategoryKey(weeklyKey)].weeklyCap);
    }
    return total;
}
function readCSV(filePath) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return data
        .split('\n')
        .slice(1) // skip header
        .map((line) => {
        const [fromLine, toLine, dateTime] = line.trim().split(',');
        return [fromLine, toLine, dateTime];
    });
}
const csvData = readCSV('input.csv');
console.log("\nTotal fare: $" + calculateTotalFare(csvData).toFixed(2) + "\n");
