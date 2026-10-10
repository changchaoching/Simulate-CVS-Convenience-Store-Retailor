/**
 * CVS 零售專家 (Retail Expert - Convenience Store Simulation Engine)
 * 核心模擬演算法與商業邏輯引擎
 * 
 * 參考特波國際 (Top-BOSS) 零售專家 (RE) 經典便利商店經營模型：
 * 包含商圈立地、商品大類 (鮮食/飲料/乾貨零食/日用品)、庫存與過期報廢、
 * 天氣與促銷、門市排班服務力、損益與現金流量表。
 */

class RetailExpertEngine {
    constructor() {
        // 商圈定義 (5大立地條件)
        this.locations = {
            commercial: {
                id: 'commercial',
                name: '商業辦公區',
                description: '上班族聚集，平日人流極高，偏好便當鮮食與現煮咖啡/飲料，重視快速結帳。',
                baseTraffic: 1400,
                weekendFactor: 0.45,
                rentPerMonth: 65000,
                preferences: { freshFood: 1.4, drinks: 1.3, snacks: 0.8, dailyGoods: 0.5 },
                rushHours: '早晨與午間尖峰明顯'
            },
            residential: {
                id: 'residential',
                name: '優質住宅區',
                description: '家庭主婦、學生與社區居民為主，週末客流佳，日用品與乾貨零食銷量穩定。',
                baseTraffic: 950,
                weekendFactor: 1.25,
                rentPerMonth: 42000,
                preferences: { freshFood: 0.9, drinks: 1.0, snacks: 1.3, dailyGoods: 1.4 },
                rushHours: '傍晚下班與宵夜時段'
            },
            school: {
                id: 'school',
                name: '大專學校區',
                description: '學生族群龐大，對價格敏感，零食、冷飲、微波鮮食需求極大，寒暑假客流降低。',
                baseTraffic: 1300,
                weekendFactor: 0.6,
                rentPerMonth: 48000,
                preferences: { freshFood: 1.2, drinks: 1.4, snacks: 1.5, dailyGoods: 0.6 },
                rushHours: '下課、午餐與晚自習'
            },
            tourist: {
                id: 'tourist',
                name: '觀光風景區',
                description: '假日人潮洶湧，晴天業績爆發，飲料冰品、特色伴手零食銷售旺盛，房租高昂。',
                baseTraffic: 800,
                weekendFactor: 2.2,
                rentPerMonth: 75000,
                preferences: { freshFood: 1.1, drinks: 1.6, snacks: 1.4, dailyGoods: 0.7 },
                rushHours: '午後與連續假期全天'
            },
            old_community: {
                id: 'old_community',
                name: '傳統老社區',
                description: '高齡長者與在地熟客，注重人情味與商品性價比，日用品與平價零食需求穩定，租金低廉。',
                baseTraffic: 750,
                weekendFactor: 1.05,
                rentPerMonth: 30000,
                preferences: { freshFood: 0.8, drinks: 0.9, snacks: 1.1, dailyGoods: 1.3 },
                rushHours: '清晨早市與黃昏時段'
            }
        };

        // 商品四大品類基本屬性與批發進貨底價 (常態進價 / 建議售價)
        this.categoryTemplates = {
            freshFood: {
                id: 'freshFood',
                name: '鮮食熱食 (便當/御飯糰/三明治)',
                icon: '🍱',
                wholesaleCost: 45,        // 批發進價 ($45)
                recommendedPrice: 75,     // 建議售價 ($75)
                shelfLifeDays: 1,         // 保存期限 1 天 (當日未售出即過期報廢 100%)
                holdingCostRate: 0.05,    // 冷藏耗電成本
                priceElasticity: 1.3      // 價格彈性
            },
            drinks: {
                id: 'drinks',
                name: '低溫冷飲 (茶飲/乳品/咖啡/碳酸)',
                icon: '🧃',
                wholesaleCost: 18,        // 批發進價 ($18)
                recommendedPrice: 32,     // 建議售價 ($32)
                shelfLifeDays: 7,         // 保存期約一週 (每日過期損耗約 2%)
                holdingCostRate: 0.03,
                priceElasticity: 1.1
            },
            snacks: {
                id: 'snacks',
                name: '常溫乾貨 (餅乾零食/泡麵/糖果)',
                icon: '🍪',
                wholesaleCost: 22,        // 批發進價 ($22)
                recommendedPrice: 38,     // 建議售價 ($38)
                shelfLifeDays: 30,        // 保存期長 (損耗極低約 0.5%)
                holdingCostRate: 0.01,
                priceElasticity: 0.9
            },
            dailyGoods: {
                id: 'dailyGoods',
                name: '日用品與文具 (衛生紙/清潔/電池)',
                icon: '🧴',
                wholesaleCost: 40,        // 批發進價 ($40)
                recommendedPrice: 65,     // 建議售價 ($65)
                shelfLifeDays: 60,        // 保存期很長 (幾乎不報廢)
                holdingCostRate: 0.01,
                priceElasticity: 0.7
            }
        };

        // 天氣型態
        this.weatherTypes = [
            { type: 'sunny', name: '晴朗炎熱', icon: '☀️', drinkBoost: 1.35, freshBoost: 1.05, trafficFactor: 1.1 },
            { type: 'cloudy', name: '多雲舒適', icon: '⛅', drinkBoost: 1.0, freshBoost: 1.0, trafficFactor: 1.0 },
            { type: 'rainy', name: '陰雨綿綿', icon: '🌧️', drinkBoost: 0.85, freshBoost: 1.1, trafficFactor: 0.82, dailyBoost: 1.25 /*雨傘雨衣*/ },
            { type: 'storm', name: '狂風大雨', icon: '⛈️', drinkBoost: 0.7, freshBoost: 0.9, trafficFactor: 0.65, dailyBoost: 1.4 },
            { type: 'cold', name: '寒流低溫', icon: '❄️', drinkBoost: 0.75, freshBoost: 1.35 /*熱食大賣*/, trafficFactor: 0.9 }
        ];

        this.reset();
    }

    /**
     * 重置模擬器回第 1 期 (第 1 週)
     */
    reset(selectedLocationId = 'commercial') {
        this.currentPeriod = 1;
        this.maxPeriods = 24;       // 24 期營運週期 (對應約半年的每週決策)
        this.locationId = selectedLocationId;
        this.location = this.locations[selectedLocationId] || this.locations.commercial;

        // 資金與資本
        this.cash = 350000;         // 初期營運周轉金 ($350,000)
        this.initialCash = 350000;
        this.accumulatedProfit = 0; // 累計淨利
        this.isGameOver = false;
        this.gameOverReason = '';
        this.isWon = false;

        // 門市評價與客情好感度 (滿分 100)
        this.serviceScore = 80;     // 門市服務滿意度
        this.cleanlinessScore = 85; // 門市清潔水準
        this.shelfAvailability = 95;// 架上陳列率 (無缺貨率)

        // 商品品類庫存狀態
        this.inventory = {
            freshFood: 180,
            drinks: 650,
            snacks: 500,
            dailyGoods: 220
        };

        // 累計經營數據
        this.totalRevenue = 0;
        this.totalCustomers = 0;
        this.totalWasteCost = 0;

        // 預設當前天氣與事件
        this.currentWeather = this.weatherTypes[1]; // 多雲
        this.currentEvent = { name: '常態經營週', factor: 1.0, desc: '無特殊節慶，以商圈常態來客為主力。' };

        // 歷史日誌與報表
        this.history = [];
        this.logs = [];

        // 預設決策參數 (供 UI 預填)
        this.lastDecisions = {
            pricing: { freshFood: 75, drinks: 32, snacks: 38, dailyGoods: 65 },
            ordering: { freshFood: 1200, drinks: 2400, snacks: 1200, dailyGoods: 400 },
            staffShiftCount: 3,     // 每日總班次人數 (正職+兼職)
            hourlyWage: 190,        // 時薪 ($190/hr)
            marketingSpend: 5000,   // 每週宣傳行銷促銷預算 ($5,000)
            shelfCleaningBudget: 2000 // 設備保養與清潔外包 ($2,000)
        };

        this.recordHistoryInitial();
    }

    /**
     * 變更商圈立地
     */
    setLocation(locId) {
        if (this.locations[locId]) {
            this.locationId = locId;
            this.location = this.locations[locId];
        }
    }

    /**
     * 隨機產生外在環境因子 (天氣與節慶活動)
     */
    generateEnvironment() {
        // 天氣抽取
        const randWeather = Math.random();
        if (randWeather < 0.35) this.currentWeather = this.weatherTypes[0]; // 晴天
        else if (randWeather < 0.65) this.currentWeather = this.weatherTypes[1]; // 多雲
        else if (randWeather < 0.82) this.currentWeather = this.weatherTypes[2]; // 雨天
        else if (randWeather < 0.92) this.currentWeather = this.weatherTypes[4]; // 寒流
        else this.currentWeather = this.weatherTypes[3]; // 暴雨

        // 特殊行銷/節慶事件
        const events = [
            { name: '日常經營週', factor: 1.0, desc: '維持常態客流與消費節奏。' },
            { name: '商圈週年慶/促銷季', factor: 1.25, desc: '周遭商場舉辦聯合促銷活動，客流量顯著上升！' },
            { name: '鄰近競品新開門市', factor: 0.82, desc: '對街競爭品牌新開幕大特價，搶走部分散客流量。' },
            { name: '開學季 / 上班潮', factor: 1.18, desc: '大量新學生/上班族湧入，鮮食與咖啡需求熱烈！' },
            { name: '連續假期效應', factor: 1.12, desc: '連假出遊出差人潮增多，車潮與伴手零食需求大增。' }
        ];

        if (this.currentPeriod % 4 === 0) {
            this.currentEvent = events[Math.floor(Math.random() * (events.length - 1)) + 1];
        } else {
            this.currentEvent = events[0];
        }
    }

    /**
     * 執行一期 (一週) 門市經營模擬計算
     * @param {Object} decisions 
     */
    step(decisions) {
        if (this.isGameOver) return;

        this.lastDecisions = JSON.parse(JSON.stringify(decisions));
        this.generateEnvironment();

        const p = decisions.pricing;
        const o = decisions.ordering;
        const staffShiftCount = Math.max(1, parseInt(decisions.staffShiftCount || 2));
        const hourlyWage = Math.max(183, parseFloat(decisions.hourlyWage || 190));
        const marketingSpend = Math.max(0, parseFloat(decisions.marketingSpend || 0));
        const shelfCleaningBudget = Math.max(0, parseFloat(decisions.shelfCleaningBudget || 0));

        // 1. 人力與服務品質計算
        // 門市基準需要每天至少 2 個班次 (早/晚/大夜約 16~24 小時覆蓋)
        // 每週所需總工時 = staffShiftCount * 8hr * 7天
        const totalWeeklyHours = staffShiftCount * 8 * 7;
        const laborCost = Math.round(totalWeeklyHours * hourlyWage);

        // 薪資滿意度效應 (基準時薪 $190)
        const wageSatisfaction = Math.min(1.25, Math.max(0.7, hourlyWage / 190));
        // 人力充裕度 (若每週班次 >= 3 則服務充足，>=4 極優，<2 結帳大排長龍)
        const staffingAdequacy = staffShiftCount >= 3 ? 1.05 : (staffShiftCount === 2 ? 0.92 : 0.65);

        this.serviceScore = Math.min(100, Math.max(40, Math.round(75 * wageSatisfaction * staffingAdequacy)));
        this.cleanlinessScore = Math.min(100, Math.max(45, Math.round(70 + (shelfCleaningBudget / 200) + (staffShiftCount >= 3 ? 8 : -5))));

        // 2. 本週客流量計算
        let weeklyTraffic = this.location.baseTraffic * 7;
        // 週末加乘
        weeklyTraffic *= (1.0 + (this.location.weekendFactor - 1.0) * 0.28);
        // 天氣與事件修正
        weeklyTraffic *= (this.currentWeather.trafficFactor || 1.0);
        weeklyTraffic *= (this.currentEvent.factor || 1.0);
        // 行銷宣傳引流 (邊際遞減)
        const marketingBoost = 1.0 + Math.min(0.25, Math.log10(1 + marketingSpend / 1000) * 0.12);
        weeklyTraffic *= marketingBoost;
        // 門市口碑 (服務+清潔)
        const reputationFactor = (this.serviceScore * 0.6 + this.cleanlinessScore * 0.4) / 80;
        weeklyTraffic *= Math.max(0.7, Math.min(1.3, reputationFactor));
        weeklyTraffic = Math.round(weeklyTraffic);

        // 3. 商品進貨與進貨成本 (每週採購總額)
        const purchaseCost = {
            freshFood: o.freshFood * this.categoryTemplates.freshFood.wholesaleCost,
            drinks: o.drinks * this.categoryTemplates.drinks.wholesaleCost,
            snacks: o.snacks * this.categoryTemplates.snacks.wholesaleCost,
            dailyGoods: o.dailyGoods * this.categoryTemplates.dailyGoods.wholesaleCost
        };
        const totalPurchaseCost = purchaseCost.freshFood + purchaseCost.drinks + purchaseCost.snacks + purchaseCost.dailyGoods;

        // 可銷售總庫存 = 上期庫存 + 本期新進貨
        const availableStock = {
            freshFood: this.inventory.freshFood + o.freshFood,
            drinks: this.inventory.drinks + o.drinks,
            snacks: this.inventory.snacks + o.snacks,
            dailyGoods: this.inventory.dailyGoods + o.dailyGoods
        };

        // 4. 計算各品類市場購買需求量 (Units Demand)
        const demand = {};
        const soldUnits = {};
        const revenueByCategory = {};
        const cogsByCategory = {};
        const wasteUnits = {};
        const wasteCostByCategory = {};
        let totalRevenue = 0;
        let totalCogs = 0;
        let totalWasteCost = 0;
        let totalLostSales = 0;

        for (let catKey of ['freshFood', 'drinks', 'snacks', 'dailyGoods']) {
            const tmpl = this.categoryTemplates[catKey];
            const pref = this.location.preferences[catKey] || 1.0;
            const userPrice = p[catKey];
            const basePrice = tmpl.recommendedPrice;

            // 價格吸引力 (價格彈性模型)
            const priceRatio = basePrice / Math.max(1, userPrice);
            const priceAttractiveness = Math.pow(priceRatio, tmpl.priceElasticity);

            // 天氣品類加成
            let weatherCategoryFactor = 1.0;
            if (catKey === 'drinks') weatherCategoryFactor = this.currentWeather.drinkBoost;
            if (catKey === 'freshFood') weatherCategoryFactor = this.currentWeather.freshBoost;
            if (catKey === 'dailyGoods' && this.currentWeather.dailyBoost) weatherCategoryFactor = this.currentWeather.dailyBoost;

            // 基準每位顧客購買率
            let buyRate = 0.22 * pref * weatherCategoryFactor * priceAttractiveness;
            let estDemand = Math.round(weeklyTraffic * buyRate);
            demand[catKey] = estDemand;

            // 實際銷售量受到可供庫存限制
            const avail = availableStock[catKey];
            const actualSold = Math.min(avail, estDemand);
            soldUnits[catKey] = actualSold;

            // 缺貨損失
            if (estDemand > avail) {
                totalLostSales += (estDemand - avail);
            }

            // 營業額與進貨銷貨成本 (COGS)
            const rev = actualSold * userPrice;
            const cogs = actualSold * tmpl.wholesaleCost;
            revenueByCategory[catKey] = rev;
            cogsByCategory[catKey] = cogs;
            totalRevenue += rev;
            totalCogs += cogs;

            // 結餘未售庫存
            let leftover = avail - actualSold;

            // 過期與報廢耗損計算
            let wasted = 0;
            if (catKey === 'freshFood') {
                // 鮮食保存極短，當週未售出 85% 必須直接報廢銷毀 (超商即期惜食/報廢)
                wasted = Math.round(leftover * 0.85);
                leftover -= wasted;
            } else if (catKey === 'drinks') {
                // 飲料保存期約一週至數週，損耗約 4%
                wasted = Math.round(leftover * 0.04);
                leftover -= wasted;
            } else if (catKey === 'snacks') {
                // 常溫乾貨約 1%
                wasted = Math.round(leftover * 0.01);
                leftover -= wasted;
            } else {
                // 日用品約 0.5%
                wasted = Math.round(leftover * 0.005);
                leftover -= wasted;
            }

            wasteUnits[catKey] = wasted;
            const wCost = wasted * tmpl.wholesaleCost;
            wasteCostByCategory[catKey] = wCost;
            totalWasteCost += wCost;

            // 更新期末庫存留至下期
            this.inventory[catKey] = leftover;
        }

        // 缺貨率 / 陳列率
        const totalDemandAll = demand.freshFood + demand.drinks + demand.snacks + demand.dailyGoods;
        const totalSoldAll = soldUnits.freshFood + soldUnits.drinks + soldUnits.snacks + soldUnits.dailyGoods;
        this.shelfAvailability = totalDemandAll > 0 ? Math.round((totalSoldAll / totalDemandAll) * 100) : 100;

        // 5. 門市營運費用 (OPEX)
        const weeklyRent = Math.round(this.location.rentPerMonth / 4.33); // 每週租金分攤
        const utilityBills = Math.round(3500 + (this.currentWeather.type === 'sunny' ? 1200 : 0)); // 冷氣/電費/水費
        const logisticsFee = Math.round(2000 + (totalPurchaseCost * 0.02)); // 物流運費
        const totalOpex = weeklyRent + laborCost + utilityBills + logisticsFee + marketingSpend + shelfCleaningBudget + totalWasteCost;

        // 6. 財務利潤與現金結算
        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - totalOpex;
        this.accumulatedProfit += netProfit;

        // 現金變動 = 營業收入 - 門市費用 - 當週批發進貨支出 (採現金結算)
        // 注意：淨利中已扣 COGS 與報廢，但實際現金流出為「當期全部進貨採購成本」
        const netCashFlow = totalRevenue - (totalPurchaseCost + weeklyRent + laborCost + utilityBills + logisticsFee + marketingSpend + shelfCleaningBudget);
        this.cash += netCashFlow;

        this.totalRevenue += totalRevenue;
        this.totalCustomers += weeklyTraffic;
        this.totalWasteCost += totalWasteCost;

        // 7. 勝負與破產判定
        if (this.cash <= 0) {
            this.isGameOver = true;
            this.isWon = false;
            this.gameOverReason = `【門市倒閉】第 ${this.currentPeriod} 期營運資金枯竭 (現金餘額 $${this.cash.toLocaleString()})！無法支付供應商進貨貨款與員工薪資，宣告停止營業！`;
        } else if (this.currentPeriod >= this.maxPeriods) {
            this.isGameOver = true;
            this.isWon = this.accumulatedProfit > 0;
            const profitMsg = this.isWon 
                ? `累計創造淨利 $${Math.round(this.accumulatedProfit).toLocaleString()}，成功躍升商圈高獲利標竿門市！` 
                : `但累計虧損 $${Math.round(Math.abs(this.accumulatedProfit)).toLocaleString()}，需檢討進貨報廢率與定價策略。`;
            this.gameOverReason = `【達成 24 期經營挑戰】門市順利完成半年度營運！現金結餘 $${Math.round(this.cash).toLocaleString()}，${profitMsg}`;
        }

        // 8. 紀錄本期營運結果日誌
        const periodRecord = {
            period: this.currentPeriod,
            traffic: weeklyTraffic,
            weather: this.currentWeather,
            event: this.currentEvent,
            pricing: p,
            ordering: o,
            demand: demand,
            soldUnits: soldUnits,
            wasteUnits: wasteUnits,
            revenueByCategory: revenueByCategory,
            totalRevenue: totalRevenue,
            cogs: totalCogs,
            grossProfit: grossProfit,
            wasteCost: totalWasteCost,
            laborCost: laborCost,
            rent: weeklyRent,
            opex: totalOpex,
            netProfit: netProfit,
            cash: this.cash,
            netCashFlow: netCashFlow,
            serviceScore: this.serviceScore,
            cleanlinessScore: this.cleanlinessScore,
            shelfAvailability: this.shelfAvailability,
            inventory: JSON.parse(JSON.stringify(this.inventory))
        };

        this.history.push(periodRecord);
        this.logs.unshift(periodRecord);

        // 推進期數
        this.currentPeriod++;
    }

    recordHistoryInitial() {
        this.history.push({
            period: 0,
            traffic: 0,
            weather: this.currentWeather,
            event: this.currentEvent,
            totalRevenue: 0,
            grossProfit: 0,
            netProfit: 0,
            cash: this.cash,
            serviceScore: this.serviceScore,
            cleanlinessScore: this.cleanlinessScore,
            shelfAvailability: this.shelfAvailability,
            inventory: JSON.parse(JSON.stringify(this.inventory))
        });
    }

    /**
     * 取得當前門市狀態摘要
     */
    getCurrentStatus() {
        return {
            period: this.currentPeriod,
            maxPeriods: this.maxPeriods,
            location: this.location,
            cash: this.cash,
            accumulatedProfit: this.accumulatedProfit,
            inventory: this.inventory,
            serviceScore: this.serviceScore,
            cleanlinessScore: this.cleanlinessScore,
            shelfAvailability: this.shelfAvailability,
            currentWeather: this.currentWeather,
            currentEvent: this.currentEvent,
            isGameOver: this.isGameOver,
            isWon: this.isWon,
            gameOverReason: this.gameOverReason
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RetailExpertEngine;
}
