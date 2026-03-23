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
    
    // Modal elements
    const modal = document.getElementById('position-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalSummary = document.getElementById('modal-summary');
    const modalApplyLink = document.getElementById('modal-apply-link');
    const closeModalBtn = document.getElementById('close-modal');

    let allPositions = [];
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
            allPositions = data.positions || [];
            if (data.last_updated) {
                const updateText = `Last Scout Run: ${data.last_updated}`;
                lastUpdatedDiv.textContent = updateText;
                footerUpdated.textContent = data.last_updated;
            }
            updatePositionCount();
            renderTable(allPositions);
            loadingDiv.classList.add('hidden');
        })
        .catch(err => {
            console.error(err);
            loadingDiv.textContent = "Error loading data. Ensure positions.json exists.";
        });

    // Update position count
    function updatePositionCount() {
        const filtered = getFilteredPositions();
        positionCountDiv.textContent = `${filtered.length} position${filtered.length !== 1 ? 's' : ''} found`;
    }

    // Get filtered positions based on all current filters
    function getFilteredPositions() {
        let filtered = [...allPositions];

        // Filter by type
        if (currentFilter !== 'all') {
            filtered = filtered.filter(p => p.type === currentFilter);
        }

        // Filter by source
        if (currentSourceFilter !== 'all') {
            filtered = filtered.filter(p => p.source === currentSourceFilter);
        }

        // Search filter
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

    // Sort positions
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

    // Check if position is new (within last 3 days)
    function isNewPosition(dateFound) {
        if (!dateFound) return false;
        const found = new Date(dateFound);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return found > threeDaysAgo;
    }

    // Format date for display
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    // Get source display name and color
    function getSourceInfo(source) {
        const sources = {
            'inspirehep': { name: 'InspireHEP', color: '#2563eb' },
            'euraxess': { name: 'EURAXESS', color: '#0d9488' },
            'academicpositions': { name: 'AcademicPos', color: '#7c3aed' },
            'findaphd': { name: 'FindAPhD', color: '#dc2626' },
            'scholarshippositions': { name: 'Scholarships', color: '#ea580c' },
            'nature': { name: 'Nature', color: '#059669' }
        };
        return sources[source] || { name: source || 'Unknown', color: '#6b7280' };
    }

    // Show position details in modal
    function showPositionDetails(position) {
        modalTitle.textContent = position.title || 'Position Details';
        
        // Create summary content
        let summaryHTML = '';
        
        if (position.summary && position.summary.length > 0) {
            summaryHTML = `
                <h4>Position Summary</h4>
                <ul>
                    ${position.summary.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
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
                </ul>
            `;
        }
        
        modalSummary.innerHTML = summaryHTML;
        modalApplyLink.href = position.link || '#';
        modal.classList.remove('hidden');
    }

    // Hide modal
    function hideModal() {
        modal.classList.add('hidden');
    }

    // Render Function
    function renderTable(positions) {
        const filtered = getFilteredPositions();
        const sorted = sortPositions(filtered);
        
        tableBody.innerHTML = '';
        updatePositionCount();

        if (sorted.length === 0) {
            noResultsDiv.classList.remove('hidden');
        } else {
            noResultsDiv.classList.add('hidden');
            
            sorted.forEach(p => {
                const tr = document.createElement('tr');
                
                const typeClass = p.type === 'phd' ? 'type-phd' : 'type-master';
                const typeLabel = (p.type || 'phd').toUpperCase();
                const isNew = isNewPosition(p.date_found);
                const sourceInfo = getSourceInfo(p.source);

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
                    <td class="date-found">${formatDate(p.date_found)}</td>
                    <td>${escapeHtml(p.notes || '-')}</td>
                    <td>
                        <a href="${p.link || '#'}" target="_blank" class="btn-link">Apply</a>
                    </td>
                `;
                
                // Add click handler for position title
                const titleElement = tr.querySelector('.position-title');
                titleElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPositionDetails(p);
                });
                
                tableBody.appendChild(tr);
            });
        }
    }

    // Event Listeners
    searchInput.addEventListener('input', () => {
        renderTable(allPositions);
    });

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

    sourceFilter.addEventListener('change', (e) => {
        currentSourceFilter = e.target.value;
        renderTable(allPositions);
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTable(allPositions);
    });

    // Modal event listeners
    closeModalBtn.addEventListener('click', hideModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

    // Keyboard navigation for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            hideModal();
        }
    });

    // Utility function to escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});