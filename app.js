/**
 * CVS 零售專家 (Retail Expert) - 門市前端互動控制器與圖表渲染
 */

let sim = null;
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    initSimulator();
    setupInputs();
    setupCharts();
    updateUI();
});

function initSimulator() {
    sim = new RetailExpertEngine();
}

function setupInputs() {
    // 1. 商圈切換
    const selLocation = document.getElementById('selectLocation');
    if (selLocation) {
        selLocation.addEventListener('change', (e) => {
            if (confirm('切換商圈將重置當前所有經營紀錄，確定要更換門市立地嗎？')) {
                sim.reset(e.target.value);
                updateLocationDetails();
                updateUI();
            } else {
                e.target.value = sim.locationId;
            }
        });
    }

    // 2. 雙向連動商品價格與進貨量 (Slider & Input)
    const categories = ['freshFood', 'drinks', 'snacks', 'dailyGoods'];
    categories.forEach(cat => {
        // Price
        const sliderP = document.getElementById(`slider-price-${cat}`);
        const numP = document.getElementById(`num-price-${cat}`);
        if (sliderP && numP) {
            sliderP.addEventListener('input', (e) => {
                numP.value = e.target.value;
                calculateEstimatedCosts();
            });
            numP.addEventListener('input', (e) => {
                sliderP.value = e.target.value;
                calculateEstimatedCosts();
            });
        }

        // Order
        const sliderO = document.getElementById(`slider-order-${cat}`);
        const numO = document.getElementById(`num-order-${cat}`);
        if (sliderO && numO) {
            sliderO.addEventListener('input', (e) => {
                numO.value = e.target.value;
                calculateEstimatedCosts();
            });
            numO.addEventListener('input', (e) => {
                sliderO.value = e.target.value;
                calculateEstimatedCosts();
            });
        }
    });

    // 3. 門市營運決策連動
    const opsInputs = [
        { id: 'staffShiftCount', prefix: '', suffix: ' 人' },
        { id: 'hourlyWage', prefix: '$', suffix: '' },
        { id: 'marketingSpend', prefix: '$', suffix: '', format: true },
        { id: 'shelfCleaningBudget', prefix: '$', suffix: '', format: true }
    ];

    opsInputs.forEach(item => {
        const slider = document.getElementById(`slider-${item.id}`);
        const display = document.getElementById(`display-${item.id}`);
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const str = item.format ? val.toLocaleString() : val;
                display.textContent = `${item.prefix}${str}${item.suffix}`;
                calculateEstimatedCosts();
            });
        }
    });

    // 4. 預設策略按鈕
    const btnPresetBalance = document.getElementById('btnPresetBalance');
    const btnPresetFresh = document.getElementById('btnPresetFresh');
    const btnPresetSafety = document.getElementById('btnPresetSafety');

    if (btnPresetBalance) {
        btnPresetBalance.addEventListener('click', () => {
            setDecisions({
                pricing: { freshFood: 75, drinks: 32, snacks: 38, dailyGoods: 65 },
                ordering: { freshFood: 1200, drinks: 2400, snacks: 1200, dailyGoods: 400 },
                staffShiftCount: 3,
                hourlyWage: 190,
                marketingSpend: 5000,
                shelfCleaningBudget: 2000
            });
        });
    }

    if (btnPresetFresh) {
        btnPresetFresh.addEventListener('click', () => {
            setDecisions({
                pricing: { freshFood: 69, drinks: 29, snacks: 38, dailyGoods: 65 },
                ordering: { freshFood: 1800, drinks: 2800, snacks: 1000, dailyGoods: 300 },
                staffShiftCount: 4,
                hourlyWage: 200,
                marketingSpend: 8000,
                shelfCleaningBudget: 3000
            });
        });
    }

    if (btnPresetSafety) {
        btnPresetSafety.addEventListener('click', () => {
            setDecisions({
                pricing: { freshFood: 78, drinks: 35, snacks: 40, dailyGoods: 70 },
                ordering: { freshFood: 800, drinks: 1800, snacks: 900, dailyGoods: 300 },
                staffShiftCount: 2,
                hourlyWage: 185,
                marketingSpend: 2000,
                shelfCleaningBudget: 1000
            });
        });
    }

    // 5. 推進與重置按鈕
    const btnStep1 = document.getElementById('btnStep1');
    const btnStep4 = document.getElementById('btnStep4');
    const btnReset = document.getElementById('btnReset');
    const btnExportCSV = document.getElementById('btnExportCSV');

    if (btnStep1) btnStep1.addEventListener('click', () => runSteps(1));
    if (btnStep4) btnStep4.addEventListener('click', () => runSteps(4));
    if (btnReset) btnReset.addEventListener('click', resetSimulation);
    if (btnExportCSV) btnExportCSV.addEventListener('click', exportCSV);

    calculateEstimatedCosts();
}

function getDecisionsFromUI() {
    return {
        pricing: {
            freshFood: parseFloat(document.getElementById('num-price-freshFood')?.value || 75),
            drinks: parseFloat(document.getElementById('num-price-drinks')?.value || 32),
            snacks: parseFloat(document.getElementById('num-price-snacks')?.value || 38),
            dailyGoods: parseFloat(document.getElementById('num-price-dailyGoods')?.value || 65)
        },
        ordering: {
            freshFood: parseInt(document.getElementById('num-order-freshFood')?.value || 1200, 10),
            drinks: parseInt(document.getElementById('num-order-drinks')?.value || 2400, 10),
            snacks: parseInt(document.getElementById('num-order-snacks')?.value || 1200, 10),
            dailyGoods: parseInt(document.getElementById('num-order-dailyGoods')?.value || 400, 10)
        },
        staffShiftCount: parseInt(document.getElementById('slider-staffShiftCount')?.value || 3, 10),
        hourlyWage: parseFloat(document.getElementById('slider-hourlyWage')?.value || 190),
        marketingSpend: parseFloat(document.getElementById('slider-marketingSpend')?.value || 5000),
        shelfCleaningBudget: parseFloat(document.getElementById('slider-shelfCleaningBudget')?.value || 2000)
    };
}

function setDecisions(d) {
    const categories = ['freshFood', 'drinks', 'snacks', 'dailyGoods'];
    categories.forEach(cat => {
        const pInput = document.getElementById(`num-price-${cat}`);
        const pSlider = document.getElementById(`slider-price-${cat}`);
        if (pInput && pSlider) {
            pInput.value = d.pricing[cat];
            pSlider.value = d.pricing[cat];
        }

        const oInput = document.getElementById(`num-order-${cat}`);
        const oSlider = document.getElementById(`slider-order-${cat}`);
        if (oInput && oSlider) {
            oInput.value = d.ordering[cat];
            oSlider.value = d.ordering[cat];
        }
    });

    const shiftSlider = document.getElementById('slider-staffShiftCount');
    const wageSlider = document.getElementById('slider-hourlyWage');
    const mktSlider = document.getElementById('slider-marketingSpend');
    const cleanSlider = document.getElementById('slider-shelfCleaningBudget');

    if (shiftSlider) shiftSlider.value = d.staffShiftCount;
    if (wageSlider) wageSlider.value = d.hourlyWage;
    if (mktSlider) mktSlider.value = d.marketingSpend;
    if (cleanSlider) cleanSlider.value = d.shelfCleaningBudget;

    document.getElementById('display-staffShiftCount').textContent = `${d.staffShiftCount} 人`;
    document.getElementById('display-hourlyWage').textContent = `$${d.hourlyWage}`;
    document.getElementById('display-marketingSpend').textContent = `$${d.marketingSpend.toLocaleString()}`;
    document.getElementById('display-shelfCleaningBudget').textContent = `$${d.shelfCleaningBudget.toLocaleString()}`;

    calculateEstimatedCosts();
}

function calculateEstimatedCosts() {
    const d = getDecisionsFromUI();
    const purchase = (d.ordering.freshFood * 45) + (d.ordering.drinks * 18) + (d.ordering.snacks * 22) + (d.ordering.dailyGoods * 40);
    const labor = d.staffShiftCount * 8 * 7 * d.hourlyWage;

    const elPurchase = document.getElementById('estPurchaseCost');
    const elLabor = document.getElementById('estLaborCost');
    if (elPurchase) elPurchase.textContent = `$${purchase.toLocaleString()}`;
    if (elLabor) elLabor.textContent = `$${labor.toLocaleString()}`;
}

function runSteps(count = 1) {
    if (sim.isGameOver) {
        alert('門市經營已結算！請點擊「重新開局」開啟全新營業週期。');
        return;
    }

    const d = getDecisionsFromUI();
    for (let i = 0; i < count; i++) {
        if (sim.isGameOver) break;
        sim.step(d);
    }

    updateUI();
    if (window.lucide) lucide.createIcons();
}

function resetSimulation() {
    if (confirm('確定要重新開始門市經營嗎？')) {
        const curLoc = sim.locationId;
        sim.reset(curLoc);
        updateLocationDetails();
        updateUI();
        if (window.lucide) lucide.createIcons();
    }
}

function updateLocationDetails() {
    const loc = sim.location;
    const badge = document.getElementById('locBadge');
    const baseTraffic = document.getElementById('locBaseTraffic');
    const rent = document.getElementById('locRent');
    const weekend = document.getElementById('locWeekendFactor');
    const desc = document.getElementById('locDesc');

    if (badge) badge.textContent = loc.name;
    if (baseTraffic) baseTraffic.textContent = `${loc.baseTraffic.toLocaleString()} 人/日`;
    if (rent) rent.textContent = `$${loc.rentPerMonth.toLocaleString()} / 月`;
    if (weekend) weekend.textContent = `${loc.weekendFactor}x`;
    if (desc) desc.textContent = loc.description;
}

function updateUI() {
    const st = sim.getCurrentStatus();

    // Top Header KPIs
    setText('kpiPeriod', `第 ${Math.min(24, st.period)} 期`);
    setText('kpiCash', `$${Math.round(st.cash).toLocaleString()}`);
    setText('kpiAccumProfit', `$${Math.round(st.accumulatedProfit).toLocaleString()}`);
    setText('kpiWeatherIcon', st.currentWeather.icon);
    setText('kpiWeatherText', st.currentWeather.name);

    const btnPeriod = document.getElementById('btnNextPeriodNum');
    if (btnPeriod) btnPeriod.textContent = Math.min(24, st.period);

    // Environment info
    setText('envWeatherIcon', st.currentWeather.icon);
    setText('envWeatherTitle', st.currentWeather.name);
    let weatherDesc = '氣溫適中，各項商品需求保持常態基準。';
    if (st.currentWeather.type === 'sunny') weatherDesc = '艷陽高照！飲料與冰品需求暴增 35%，顧客進店率增加。';
    if (st.currentWeather.type === 'rainy') weatherDesc = '連續降雨，顧客出門意願降低，雨具日用品銷量增加。';
    if (st.currentWeather.type === 'storm') weatherDesc = '狂風暴雨警報！整體來客量驟跌，須提防商品積壓。';
    if (st.currentWeather.type === 'cold') weatherDesc = '寒流來襲！便當、熱食與咖啡熱賣 35%，冷飲銷量受挫。';
    setText('envWeatherDesc', weatherDesc);

    setText('envEventTitle', st.currentEvent.name);
    setText('envEventDesc', st.currentEvent.desc);

    // Service Scores
    setText('valServiceScore', `${st.serviceScore} 分`);
    setText('valCleanScore', `${st.cleanlinessScore} 分`);
    setText('valShelfScore', `${st.shelfAvailability} %`);

    // Inventory status
    setText('stock-freshFood', `${st.inventory.freshFood.toLocaleString()} 份`);
    setText('stock-drinks', `${st.inventory.drinks.toLocaleString()} 瓶`);
    setText('stock-snacks', `${st.inventory.snacks.toLocaleString()} 包`);
    setText('stock-dailyGoods', `${st.inventory.dailyGoods.toLocaleString()} 件`);

    // Latest period financial summary
    if (sim.history.length > 1) {
        const last = sim.history[sim.history.length - 1];
        setText('sumRev', `$${last.totalRevenue.toLocaleString()}`);
        setText('sumCogs', `$${last.cogs.toLocaleString()}`);
        setText('sumGross', `$${last.grossProfit.toLocaleString()}`);
        setText('sumWaste', `-$${last.wasteCost.toLocaleString()}`);
        setText('sumOpex', `$${last.opex.toLocaleString()}`);
        setText('sumNet', `$${last.netProfit.toLocaleString()}`);
        setText('sumCashFlow', `${last.netCashFlow >= 0 ? '+' : ''}$${last.netCashFlow.toLocaleString()}`);
    }

    // Game Over Banner
    renderGameBanner();

    // Table & Charts
    renderTable();
    updateCharts();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function renderGameBanner() {
    const banner = document.getElementById('gameStatusBanner');
    if (!banner) return;

    if (sim.isGameOver) {
        banner.classList.remove('hidden');
        if (sim.isWon) {
            banner.className = 'p-5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm';
            banner.innerHTML = `
                <div class="flex items-start gap-4">
                    <span class="text-3xl">🏆</span>
                    <div>
                        <h4 class="font-bold text-base text-emerald-900">恭喜！門市經營大獲全勝（完成 24 期營運挑戰）</h4>
                        <p class="text-xs text-emerald-800 mt-1 leading-relaxed">${sim.gameOverReason}</p>
                        <div class="mt-3 flex gap-2">
                            <button onclick="resetSimulation()" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow">挑戰其他商圈</button>
                            <button onclick="exportCSV()" class="px-4 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold">匯出戰績報表</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            banner.className = 'p-5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-950 shadow-sm';
            banner.innerHTML = `
                <div class="flex items-start gap-4">
                    <span class="text-3xl">⚠️</span>
                    <div>
                        <h4 class="font-bold text-base text-rose-900">門市營運資金枯竭宣告倒閉！</h4>
                        <p class="text-xs text-rose-800 mt-1 leading-relaxed">${sim.gameOverReason}</p>
                        <div class="text-[11px] text-rose-700 mt-2 bg-white/70 p-2.5 rounded-lg border border-rose-200">
                            💡 建議檢討方針：注意鮮食商品當日未售出之高額報廢損失、適度調升毛利率，並避免在離峰或陰雨天盲目超量進貨。
                        </div>
                        <div class="mt-3">
                            <button onclick="resetSimulation()" class="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow">重新開局挑戰</button>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        banner.classList.add('hidden');
    }
}

function renderTable() {
    const tbody = document.getElementById('historyTableBody');
    const countBadge = document.getElementById('tableRecordCount');
    if (!tbody) return;

    const records = sim.history.filter(h => h.period > 0).slice().reverse();
    if (countBadge) countBadge.textContent = `共 ${records.length} 筆紀錄`;

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-slate-400 font-sans italic">尚無營運數據，請點擊「推進下一期」開始經營</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

        const netColor = r.netProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
        tr.innerHTML = `
            <td class="p-2.5 font-bold text-slate-900">第 ${r.period} 期</td>
            <td class="p-2.5 font-sans">${r.weather.icon} ${r.weather.name}</td>
            <td class="p-2.5 text-right">${r.traffic.toLocaleString()}</td>
            <td class="p-2.5 text-right font-medium text-slate-800">$${r.totalRevenue.toLocaleString()}</td>
            <td class="p-2.5 text-right font-medium text-slate-700">$${r.grossProfit.toLocaleString()}</td>
            <td class="p-2.5 text-right text-rose-600 font-medium">-$${r.wasteCost.toLocaleString()}</td>
            <td class="p-2.5 text-right ${netColor}">$${r.netProfit.toLocaleString()}</td>
            <td class="p-2.5 text-right font-bold text-slate-900">$${r.cash.toLocaleString()}</td>
            <td class="p-2.5 text-center font-sans"><span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">${r.serviceScore}</span></td>
            <td class="p-2.5 text-center font-sans"><span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">${r.shelfAvailability}%</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Chart.js High Contrast Bright Theme Options
function setupCharts() {
    const lightGrid = { color: 'rgba(226, 232, 240, 0.8)', drawBorder: false };
    const lightTicks = { color: '#475569', font: { size: 10, family: 'JetBrains Mono' } };
    const commonPlugins = {
        legend: {
            labels: { color: '#334155', font: { size: 11, weight: '500' }, boxWidth: 12 }
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#0f172a',
            bodyColor: '#334155',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            padding: 8
        }
    };

    // Chart 1: Revenue vs Net Profit
    const ctxFin = document.getElementById('chartFin')?.getContext('2d');
    if (ctxFin) {
        charts.fin = new Chart(ctxFin, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '營業收入 ($)',
                        data: [],
                        borderColor: '#0284c7', // sky-600
                        backgroundColor: 'rgba(2, 132, 199, 0.08)',
                        fill: true,
                        tension: 0.2,
                        borderWidth: 2
                    },
                    {
                        label: '營業淨利 ($)',
                        data: [],
                        borderColor: '#10b981', // emerald-500
                        backgroundColor: 'transparent',
                        tension: 0.2,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: { x: { grid: lightGrid, ticks: lightTicks }, y: { grid: lightGrid, ticks: lightTicks } }
            }
        });
    }

    // Chart 2: Cash & Cumulative Profit
    const ctxCash = document.getElementById('chartCash')?.getContext('2d');
    if (ctxCash) {
        charts.cash = new Chart(ctxCash, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '現金餘額 ($)',
                        data: [],
                        borderColor: '#059669', // emerald-600
                        tension: 0.2,
                        borderWidth: 2
                    },
                    {
                        label: '累計獲利 ($)',
                        data: [],
                        borderColor: '#6366f1', // indigo-500
                        borderDash: [4, 4],
                        tension: 0.2,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: { x: { grid: lightGrid, ticks: lightTicks }, y: { grid: lightGrid, ticks: lightTicks } }
            }
        });
    }

    // Chart 3: Category Sales Units
    const ctxSales = document.getElementById('chartSales')?.getContext('2d');
    if (ctxSales) {
        charts.sales = new Chart(ctxSales, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    { label: '鮮食熱食', data: [], backgroundColor: '#10b981' },
                    { label: '低溫冷飲', data: [], backgroundColor: '#0284c7' },
                    { label: '常溫乾貨', data: [], backgroundColor: '#f59e0b' },
                    { label: '日用百貨', data: [], backgroundColor: '#8b5cf6' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: {
                    x: { stacked: true, grid: lightGrid, ticks: lightTicks },
                    y: { stacked: true, grid: lightGrid, ticks: lightTicks }
                }
            }
        });
    }

    // Chart 4: Waste Cost vs Shelf Availability
    const ctxWaste = document.getElementById('chartWaste')?.getContext('2d');
    if (ctxWaste) {
        charts.waste = new Chart(ctxWaste, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '過期報廢損失 ($)',
                        data: [],
                        borderColor: '#ef4444', // red-500
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        yAxisID: 'y',
                        borderWidth: 2
                    },
                    {
                        label: '架上充足率 (%)',
                        data: [],
                        borderColor: '#d97706', // amber-600
                        borderDash: [3, 3],
                        yAxisID: 'y1',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: {
                    x: { grid: lightGrid, ticks: lightTicks },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: lightGrid,
                        ticks: lightTicks,
                        title: { display: true, text: '報廢金額 ($)', color: '#64748b', font: { size: 9 } }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: lightTicks,
                        min: 0,
                        max: 100,
                        title: { display: true, text: '充足率 (%)', color: '#64748b', font: { size: 9 } }
                    }
                }
            }
        });
    }
}

function updateCharts() {
    const validHistory = sim.history.filter(h => h.period > 0);
    const labels = validHistory.map(h => `P${h.period}`);

    if (charts.fin) {
        charts.fin.data.labels = labels;
        charts.fin.data.datasets[0].data = validHistory.map(h => h.totalRevenue);
        charts.fin.data.datasets[1].data = validHistory.map(h => h.netProfit);
        charts.fin.update();
    }

    if (charts.cash) {
        charts.cash.data.labels = labels;
        charts.cash.data.datasets[0].data = validHistory.map(h => h.cash);
        let accum = 0;
        charts.cash.data.datasets[1].data = validHistory.map(h => {
            accum += h.netProfit;
            return accum;
        });
        charts.cash.update();
    }

    if (charts.sales) {
        charts.sales.data.labels = labels;
        charts.sales.data.datasets[0].data = validHistory.map(h => h.soldUnits.freshFood);
        charts.sales.data.datasets[1].data = validHistory.map(h => h.soldUnits.drinks);
        charts.sales.data.datasets[2].data = validHistory.map(h => h.soldUnits.snacks);
        charts.sales.data.datasets[3].data = validHistory.map(h => h.soldUnits.dailyGoods);
        charts.sales.update();
    }

    if (charts.waste) {
        charts.waste.data.labels = labels;
        charts.waste.data.datasets[0].data = validHistory.map(h => h.wasteCost);
        charts.waste.data.datasets[1].data = validHistory.map(h => h.shelfAvailability);
        charts.waste.update();
    }
}

function exportCSV() {
    const validHistory = sim.history.filter(h => h.period > 0);
    if (validHistory.length === 0) {
        alert('尚無營運數據可供匯出！');
        return;
    }

    let csv = 'data:text/csv;charset=utf-8,\uFEFF';
    const headers = [
        '期數', '商圈立地', '天氣', '情境事件', '客流量', '營業收入', '銷貨成本',
        '營業毛利', '過期報廢損失', '門市費用OPEX', '營業淨利', '期末現金',
        '鮮食銷量', '冷飲銷量', '乾貨銷量', '日用銷量', '服務滿意度', '架上充足率'
    ];
    csv += headers.join(',') + '\r\n';

    validHistory.forEach(r => {
        const row = [
            r.period,
            `"${sim.location.name}"`,
            `"${r.weather.name}"`,
            `"${r.event.name}"`,
            r.traffic,
            r.totalRevenue,
            r.cogs,
            r.grossProfit,
            r.wasteCost,
            r.opex,
            r.netProfit,
            r.cash,
            r.soldUnits.freshFood,
            r.soldUnits.drinks,
            r.soldUnits.snacks,
            r.soldUnits.dailyGoods,
            r.serviceScore,
            r.shelfAvailability
        ];
        csv += row.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CVS_Retail_Expert_Simulation_${sim.locationId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
