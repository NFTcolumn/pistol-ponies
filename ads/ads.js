import { WalletManager } from '/js/wallet/WalletManager.js';
import { ContractManager } from '/js/wallet/ContractManager.js';

class AdsDashboard {
    constructor() {
        this.wallet = new WalletManager();
        this.contract = new ContractManager(this.wallet);

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateStats();
        this.refreshActiveAds();

        // Refresh every 30 seconds
        setInterval(() => {
            this.updateStats();
            this.refreshActiveAds();
        }, 30000);
    }

    setupEventListeners() {
        const connectBtn = document.getElementById('connectBtn');
        const buyBtn = document.getElementById('buyBtn');
        const durationInput = document.getElementById('duration');

        connectBtn.addEventListener('click', async () => {
            try {
                await this.wallet.connect();
                document.getElementById('walletAddress').textContent = this.wallet.getShortAddress();
                connectBtn.style.display = 'none';
                this.loadMyAds();
            } catch (err) {
                console.error(err);
            }
        });

        durationInput.addEventListener('input', () => {
            const hours = parseInt(durationInput.value) || 0;
            const rate = 0.00001389;
            const total = (hours * rate).toFixed(8);
            document.getElementById('costEstimate').textContent = `Total Cost: ${total} ETH`;
        });

        buyBtn.addEventListener('click', async () => {
            const imageUrl = document.getElementById('imageUrl').value;
            const hours = parseInt(durationInput.value);
            const status = document.getElementById('txStatus');

            if (!this.wallet.connected) {
                status.textContent = 'Please connect wallet first';
                status.style.color = '#ff6b6b';
                return;
            }

            if (!imageUrl.startsWith('https://')) {
                status.textContent = 'HTTPS URL required';
                status.style.color = '#ff6b6b';
                return;
            }

            try {
                status.textContent = 'Pending transaction...';
                status.style.color = '#ffe66d';

                const tx = await this.contract.buyAdQueue(imageUrl, hours);
                status.textContent = 'Ad queued successfully!';
                status.style.color = '#51cf66';

                this.updateStats();
                this.loadMyAds();
            } catch (err) {
                status.textContent = `Error: ${err.message}`;
                status.style.color = '#ff6b6b';
            }
        });
    }

    async updateStats() {
        try {
            const price = await this.contract.getSlotPrice();
            const priceEth = (Number(price) / 1e18).toFixed(8);
            document.getElementById('hourlyRate').textContent = `${priceEth} ETH`;

            const availability = await this.contract.getAvailability();
            const now = Math.floor(Date.now() / 1000);

            // Find earliest track end time
            let earliest = availability[0];
            let totalSeconds = 0;

            for (let time of availability) {
                if (BigInt(time) < BigInt(earliest)) earliest = time;
                if (BigInt(time) > BigInt(now)) {
                    totalSeconds += Number(BigInt(time) - BigInt(now));
                }
            }

            const earliestDate = new Date(Number(earliest) * 1000);
            const formattedDate = earliestDate <= new Date() ? 'NOW' :
                earliestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            document.getElementById('nextAvailable').textContent = formattedDate;
            document.getElementById('totalQueue').textContent = `${(totalSeconds / 3600).toFixed(1)} hrs`;

        } catch (err) {
            console.error('Failed to update stats:', err);
        }
    }

    async refreshActiveAds() {
        const grid = document.getElementById('activeAdsGrid');
        grid.innerHTML = 'Loading active ads...';

        try {
            const ads = await this.contract.getActiveAds();
            grid.innerHTML = '';

            for (let i = 0; i < 16; i++) {
                const adDiv = document.createElement('div');
                adDiv.className = 'ad-preview';

                const url = ads.imageUrls[i] || '/ads/splash-1200x630.png';
                adDiv.innerHTML = `
                    <img src="${url}" onerror="this.src='/ads/splash-1200x630.png'">
                    <div class="ad-label">Track ${i + 1}</div>
                `;
                grid.appendChild(adDiv);
            }
        } catch (err) {
            console.error('Failed to refresh ads:', err);
            grid.innerHTML = 'Error loading ads';
        }
    }

    async loadMyAds() {
        const body = document.getElementById('myAdsBody');
        body.innerHTML = '<tr><td colspan="5">Loading your ads...</td></tr>';

        try {
            const myAds = await this.contract.getMyAds();
            body.innerHTML = '';

            if (myAds.length === 0) {
                body.innerHTML = '<tr><td colspan="5">No ads found for your wallet</td></tr>';
                return;
            }

            // myAds is { trackIndices, imageUrls, startTimes, endTimes }
            for (let i = 0; i < myAds.imageUrls.length; i++) {
                const tr = document.createElement('tr');
                const start = new Date(Number(myAds.startTimes[i]) * 1000).toLocaleString();
                const end = new Date(Number(myAds.endTimes[i]) * 1000).toLocaleString();
                const now = Date.now() / 1000;

                const isActive = now >= Number(myAds.startTimes[i]) && now < Number(myAds.endTimes[i]);
                const status = isActive ? '<span class="status-pill status-active">Active</span>' :
                    '<span class="status-pill status-pending">Queued</span>';

                tr.innerHTML = `
                    <td>Track ${myAds.trackIndices[i] + 1}</td>
                    <td><img src="${myAds.imageUrls[i]}" style="height: 30px; border-radius: 4px;"></td>
                    <td>${start}</td>
                    <td>${end}</td>
                    <td>${status}</td>
                `;
                body.appendChild(tr);
            }
        } catch (err) {
            console.error('Failed to load my ads:', err);
            body.innerHTML = '<tr><td colspan="5">Error loading ads</td></tr>';
        }
    }
}

new AdsDashboard();
