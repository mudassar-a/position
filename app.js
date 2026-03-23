document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('positions-body');
    const loadingDiv = document.getElementById('loading');
    const noResultsDiv = document.getElementById('no-results');
    const searchInput = document.getElementById('search');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const sourceFilter = document.getElementById('source-filter');
    const sortSelect = document.getElementById('sort-select');
    const lastUpdatedDiv = document.getElementById('last-updated');
    const positionCountDiv = document.getElementById('position-count');
    const footerUpdated = document.getElementById('footer-updated');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Modal elements
    const modal = document.getElementById('position-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalSummary = document.getElementById('modal-summary');
    const modalApplyLink = document.getElementById('modal-apply-link');
    const closeModalBtn = document.getElementById('close-modal');

    let activePositions = [];
    let archivedPositions = [];
    let currentView = 'active'; // 'active' or 'archive'
    let currentFilter = 'all';
    let currentSourceFilter = 'all';
    let currentSort = 'date_found_desc';

    // Fetch Data
    fetch('positions.json')
        .then(response => {
            if (!response.ok) throw new Error("Failed to load positions");
            return response.json();
        })
        .then(data => {
            // Support both old and new format
            if (data.active_positions) {
                activePositions = data.active_positions || [];
                archivedPositions = data.archived_positions || [];
            } else {
                activePositions = data.positions || [];
                archivedPositions = [];
            }
            if (data.last_updated) {
                const updateText = `Last Scout Run: ${data.last_updated}`;
                lastUpdatedDiv.textContent = updateText;
                if (footerUpdated) footerUpdated.textContent = data.last_updated;
            }
            // Update tab counts
            updateTabCounts();
            updatePositionCount();
            renderTable();
            loadingDiv.classList.add('hidden');
        })
        .catch(err => {
            console.error(err);
            loadingDiv.textContent = "Error loading data. Ensure positions.json exists.";
        });

    function getActiveData() {
        return currentView === 'active' ? activePositions : archivedPositions;
    }

    function updateTabCounts() {
        const activeTab = document.getElementById('tab-active');
        const archiveTab = document.getElementById('tab-archive');
        if (activeTab) activeTab.textContent = `Active (${activePositions.length})`;
        if (archiveTab) archiveTab.textContent = `Archived (${archivedPositions.length})`;
    }

    function updatePositionCount() {
        const filtered = getFilteredPositions();
        if (positionCountDiv) {
            positionCountDiv.textContent = `${filtered.length} position${filtered.length !== 1 ? 's' : ''} shown`;
        }
    }

    function getFilteredPositions() {
        let filtered = [...getActiveData()];

        if (currentFilter !== 'all') {
            filtered = filtered.filter(p => p.type === currentFilter);
        }

        if (currentSourceFilter !== 'all') {
            filtered = filtered.filter(p => p.source === currentSourceFilter);
        }

        const query = searchInput.value.toLowerCase();
        if (query) {
            filtered = filtered.filter(p =>
                (p.title || '').toLowerCase().includes(query) ||
                (p.institution || '').toLowerCase().includes(query) ||
                (p.country || '').toLowerCase().includes(query) ||
                (p.notes || '').toLowerCase().includes(query) ||
                (p.source || '').toLowerCase().includes(query)
            );
        }

        return filtered;
    }

    function sortPositions(positions) {
        return positions.sort((a, b) => {
            switch (currentSort) {
                case 'date_found_desc':
                    return new Date(b.date_found || '2026-01-01') - new Date(a.date_found || '2026-01-01');
                case 'date_found_asc':
                    return new Date(a.date_found || '2026-01-01') - new Date(b.date_found || '2026-01-01');
                case 'deadline_asc':
                    return new Date(a.deadline || '2030-12-31') - new Date(b.deadline || '2030-12-31');
                case 'title_asc':
                    return (a.title || '').localeCompare(b.title || '');
                default:
                    return 0;
            }
        });
    }

    function isNewPosition(dateFound) {
        if (!dateFound) return false;
        const found = new Date(dateFound);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return found > threeDaysAgo;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    function getSourceInfo(source) {
        const sources = {
            'inspirehep': { name: 'InspireHEP', color: '#2563eb' },
            'euraxess': { name: 'EURAXESS', color: '#0d9488' },
            'academicpositions': { name: 'AcademicPos', color: '#7c3aed' },
            'findaphd': { name: 'FindAPhD', color: '#dc2626' },
            'scholarshippositions': { name: 'Scholarships', color: '#ea580c' },
            'nature': { name: 'Nature', color: '#059669' },
            'daad': { name: 'DAAD', color: '#4338ca' },
            'phdportal': { name: 'PhD Portal', color: '#be185d' },
            'scholars4dev': { name: 'Scholars4Dev', color: '#065f46' }
        };
        return sources[source] || { name: source || 'Unknown', color: '#6b7280' };
    }

    function showPositionDetails(position) {
        modalTitle.textContent = position.title || 'Position Details';

        let summaryHTML = '';

        if (position.summary && position.summary.length > 0) {
            summaryHTML = `
                <h4>Position Summary</h4>
                <ul>${position.summary.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            `;
        } else {
            summaryHTML = `
                <h4>Position Details</h4>
                <ul>
                    <li><strong>Institution:</strong> ${escapeHtml(position.institution || 'Unknown')}</li>
                    <li><strong>Location:</strong> ${escapeHtml(position.country || 'Unknown')}</li>
                    <li><strong>Deadline:</strong> ${escapeHtml(position.deadline || 'Not specified')}</li>
                    <li><strong>Type:</strong> ${escapeHtml(position.type || 'Unknown').toUpperCase()}</li>
                    <li><strong>Source:</strong> ${getSourceInfo(position.source).name}</li>
                    <li><strong>Date Found:</strong> ${formatDate(position.date_found)}</li>
                    ${position.notes ? `<li><strong>Tags:</strong> ${escapeHtml(position.notes)}</li>` : ''}
                    ${position.archived_reason ? `<li><strong>Archived:</strong> ${escapeHtml(position.archived_reason)}</li>` : ''}
                </ul>
            `;
        }

        modalSummary.innerHTML = summaryHTML;
        modalApplyLink.href = position.link || '#';
        modalApplyLink.textContent = currentView === 'archive' ? 'View Listing' : 'Apply Now';
        modal.classList.remove('hidden');
    }

    function hideModal() {
        modal.classList.add('hidden');
    }

    function renderTable() {
        const filtered = getFilteredPositions();
        const sorted = sortPositions(filtered);

        tableBody.innerHTML = '';
        updatePositionCount();

        // Update table headers for archive view
        const dateFoundHeader = document.querySelector('.date-found-header');
        if (dateFoundHeader) {
            dateFoundHeader.textContent = currentView === 'archive' ? 'Archived' : 'Date Found';
        }

        if (sorted.length === 0) {
            noResultsDiv.classList.remove('hidden');
            noResultsDiv.innerHTML = currentView === 'archive'
                ? 'No archived positions found matching filters.'
                : 'No active positions found matching filters.';
        } else {
            noResultsDiv.classList.add('hidden');

            sorted.forEach(p => {
                const tr = document.createElement('tr');
                if (currentView === 'archive') tr.classList.add('archived-row');

                const typeClass = p.type === 'phd' ? 'type-phd' : 'type-master';
                const typeLabel = (p.type || 'phd').toUpperCase();
                const isNew = currentView === 'active' && isNewPosition(p.date_found);
                const sourceInfo = getSourceInfo(p.source);
                const dateDisplay = currentView === 'archive'
                    ? formatDate(p.archived_date)
                    : formatDate(p.date_found);

                tr.innerHTML = `
                    <td>
                        <span class="type-badge ${typeClass}">${typeLabel}</span>
                        <span class="position-title" data-id="${p.id}">${escapeHtml(p.title || 'Untitled Position')}</span>
                        ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                    </td>
                    <td class="inst-name" title="${escapeHtml(p.institution || 'Unknown')}">${escapeHtml(p.institution || 'Unknown')}</td>
                    <td>${escapeHtml(p.country || 'Unknown')}</td>
                    <td>${escapeHtml(formatDate(p.deadline))}</td>
                    <td>
                        <span class="source-badge" style="background-color: ${sourceInfo.color}15; color: ${sourceInfo.color};">
                            ${sourceInfo.name}
                        </span>
                    </td>
                    <td class="date-found">${dateDisplay}</td>
                    <td>${escapeHtml(p.notes || '-')}</td>
                    <td>
                        ${currentView === 'archive'
                            ? `<span class="archive-reason" title="${escapeHtml(p.archived_reason || '')}">📦 Archived</span>`
                            : `<a href="${p.link || '#'}" target="_blank" class="btn-link">Apply</a>`
                        }
                    </td>
                `;

                const titleElement = tr.querySelector('.position-title');
                titleElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPositionDetails(p);
                });

                tableBody.appendChild(tr);
            });
        }
    }

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderTable();
        });
    });

    // Filter/type buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTable();
        });
    });

    // Source filter
    if (sourceFilter) {
        sourceFilter.addEventListener('change', (e) => {
            currentSourceFilter = e.target.value;
            renderTable();
        });
    }

    // Sort
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderTable();
        });
    }

    // Search
    searchInput.addEventListener('input', () => {
        renderTable();
    });

    // Modal
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            hideModal();
        }
    });

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
