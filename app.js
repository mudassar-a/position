document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('positions-body');
    const loadingDiv = document.getElementById('loading');
    const noResultsDiv = document.getElementById('no-results');
    const searchInput = document.getElementById('search');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const lastUpdatedDiv = document.getElementById('last-updated');

    let allPositions = [];
    let currentFilter = 'all';

    // Fetch Data
    fetch('positions.json')
        .then(response => {
            if (!response.ok) throw new Error("Failed to load positions");
            return response.json();
        })
        .then(data => {
            allPositions = data.positions || [];
            if (data.last_updated) {
                lastUpdatedDiv.textContent = `Last Scout Run: ${data.last_updated}`;
            }
            renderTable(allPositions);
            loadingDiv.classList.add('hidden');
        })
        .catch(err => {
            console.error(err);
            loadingDiv.textContent = "Error loading data. Ensure positions.json exists.";
        });

    // Render Function
    function renderTable(positions) {
        tableBody.innerHTML = '';
        
        // Filter by type
        let filtered = positions.filter(p => {
            if (currentFilter === 'all') return true;
            return p.type === currentFilter;
        });

        // Search Filter
        const query = searchInput.value.toLowerCase();
        if (query) {
            filtered = filtered.filter(p => 
                p.title.toLowerCase().includes(query) ||
                p.institution.toLowerCase().includes(query) ||
                p.country.toLowerCase().includes(query) ||
                p.notes.toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            noResultsDiv.classList.remove('hidden');
        } else {
            noResultsDiv.classList.add('hidden');
            
            filtered.forEach(p => {
                const tr = document.createElement('tr');
                
                const typeClass = p.type === 'phd' ? 'type-phd' : 'type-master';
                const typeLabel = p.type.toUpperCase();

                // Simplify Link display (some are long)
                
                tr.innerHTML = `
                    <td>
                        <span class="type-badge ${typeClass}">${typeLabel}</span>
                        <span class="position-title">${escapeHtml(p.title)}</span>
                    </td>
                    <td class="inst-name">${escapeHtml(p.institution)}</td>
                    <td>${escapeHtml(p.country)}</td>
                    <td>${escapeHtml(p.deadline)}</td>
                    <td>${escapeHtml(p.notes)}</td>
                    <td>
                        <a href="${p.link}" target="_blank" class="btn-link">Apply</a>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    }

    // Event Listeners
    searchInput.addEventListener('input', () => renderTable(allPositions));

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update UI
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update State
            currentFilter = btn.dataset.filter;
            renderTable(allPositions);
        });
    });

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});