import * as fs from 'fs';

type Line = "Green" | "Red";
type CategoryKey = `${Line}-${Line}`;

interface CategoryInfo {
	peak: number;
	nonPeak: number;
	dailyCap: number;
	weeklyCap: number;
}

const categories: Record<CategoryKey, CategoryInfo> = {
	"Green-Green": { peak: 2, nonPeak: 1, dailyCap: 8, weeklyCap: 55 },
	"Red-Red": { peak: 3, nonPeak: 2, dailyCap: 12, weeklyCap: 70 },
	"Green-Red": { peak: 4, nonPeak: 3, dailyCap: 15, weeklyCap: 90 },
	"Red-Green": { peak: 3, nonPeak: 2, dailyCap: 15, weeklyCap: 90 },
};

function getISOWeek(dt: Date): [number, number] {		// bascially we need the year & week-number of a date
	const date = new Date(dt.getTime());
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
	const week1 = new Date(date.getFullYear(), 0, 4);
	week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7));
	const diff = date.getTime() - week1.getTime();
	return [week1.getFullYear(), Math.ceil(diff / 604800000) + 1];
}

function isPeak(dt: Date): boolean {

	const day = dt.getDay();
	const hours = dt.getHours();
	const minutes = dt.getMinutes();
	const time = hours * 100 + minutes;

    console.log(`day is: ${day} & hour is: ${hours} & min is: ${minutes} & time is: ${time}`);

	if (day >= 1 && day <= 5) {
		return (
			(time >= 800 && time < 1000) || (time >= 1630 && time < 1900)       // mon - fri: 8:00 to 10:00, 16:30 to 19:00
		);
	} else if (day === 6) {
		return (
			(time >= 1000 && time < 1400) || (time >= 1800 && time < 2300)      // sat - 10:00 to 14:00, 18:00 to 23:00
		);
	} else if (day === 0) {
		return time >= 1800 && time < 2300;     // sun - 18:00 to 23:00
	}
    
	return false;
}

function extractCategoryKey(key: string): CategoryKey {
    return key.split('-').slice(0, 2).join('-') as CategoryKey;		// "Green-Green-2021-03-24"  =>  "Green-Green"
}

function calculateTotalFare(csvRows: [Line, Line, string][]): number {
	
	// daily sums
	const dailySums: Record<string, number> = {};
	for (const [fromLine, toLine, dtStr] of csvRows) {
		const dt = new Date(dtStr);
		const dateKey = dt.toISOString().split("T")[0];
		const categoryKey: CategoryKey = `${fromLine}-${toLine}`;
		const category = categories[categoryKey];

		if (!category) throw new Error(`Invalid category: ${categoryKey}`);

		const fare = isPeak(dt) ? category.peak : category.nonPeak;
		const dailyKey = `${categoryKey}-${dateKey}`;
		dailySums[dailyKey] = (dailySums[dailyKey] || 0) + fare;
	}

	// daily caps
	const dailyCapped: Record<string, number> = {};
	for (const [key, sum] of Object.entries(dailySums)) {
		dailyCapped[key] = Math.min(sum, categories[extractCategoryKey(key)].dailyCap);
	}

	// weekly sums
	const weeklySums: Record<string, number> = {};
	for (const [key, capped] of Object.entries(dailyCapped)) {
		const dateStr = key.split("-").slice(2).join("-");		// 'Green-Green-2021-03-24'  =>  '2021-03-24'
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


function readCSV(filePath: string): [Line, Line, string][] {
    const data = fs.readFileSync(filePath, 'utf-8');
    return data
        .split('\n')
        .slice(1)		// skip header
		.map((line: string) => {
            const [fromLine, toLine, dateTime] = line.trim().split(',');
            return [fromLine as Line, toLine as Line, dateTime];
        });
}

const csvData = readCSV('input.csv');
console.log("\nTotal fare: $" + calculateTotalFare(csvData).toFixed(2) + "\n");
