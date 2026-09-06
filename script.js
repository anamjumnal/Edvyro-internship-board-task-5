const API_URL = "/api/internships";

let currentPage = 1;
const limit = 6;
let currentInternships = [];
let selectedInternship = null;

// DOM
const searchInput = document.getElementById("search-input");
const domainFilter = document.getElementById("domain-filter");
const modeFilter = document.getElementById("mode-filter");
const clearFilters = document.getElementById("clear-filters");
const loadingState = document.getElementById("loading-state");
const emptyState = document.getElementById("empty-state");
const errorState = document.getElementById("error-state");
const retryButton = document.getElementById("retry-button");
const internshipsList = document.getElementById("internships-list");
const pagination = document.getElementById("pagination");
const prevPage = document.getElementById("prev-page");
const pageInfo = document.getElementById("page-info");
const nextPage = document.getElementById("next-page");

// DETAIL MODAL
const detailModal = document.getElementById("detail-modal");
const closeModal = document.getElementById("close-modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const applyBtn = document.getElementById("apply-btn");
const closeModalBtn = document.getElementById("close-modal-btn");

// APPLICATION MODAL
const applicationModal = document.getElementById("application-modal");
const closeAppModal = document.getElementById("close-app-modal");
const closeAppModalBtn = document.getElementById("close-app-modal-btn");
const applicationForm = document.getElementById("application-form");
const appFormLoading = document.getElementById("app-form-loading");
const appFormError = document.getElementById("app-form-error");
const appFormSuccess = document.getElementById("app-form-success");

// INIT
document.addEventListener("DOMContentLoaded", () => {
    loadInternships();
    setupListeners();
});

// LOAD INTERNSHIPS
async function loadInternships() {
    loadingState.hidden = false;
    errorState.hidden = true;
    emptyState.hidden = true;

    try {
        const params = new URLSearchParams();
        params.append("page", currentPage);
        params.append("limit", limit);

        if (searchInput.value.trim()) params.append("search", searchInput.value.trim());
        if (domainFilter.value) params.append("domain", domainFilter.value);
        if (modeFilter.value) params.append("mode", modeFilter.value);

        const response = await fetch(`${API_URL}?${params.toString()}`);
        if (!response.ok) throw new Error("Server error");

        const result = await response.json();
        if (result.status !== "success") throw new Error("Failed to load");

        currentInternships = result.data || [];
        renderInternships(currentInternships);
        updatePagination(result.pagination);
        loadingState.hidden = true;

    } catch (error) {
        console.error("Error:", error);
        loadingState.hidden = true;
        errorState.hidden = false;
        internshipsList.innerHTML = "";
    }
}

// RENDER
function renderInternships(internships) {
    internshipsList.innerHTML = "";

    if (!internships || internships.length === 0) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    internships.forEach((internship) => {
        const card = document.createElement("article");
        card.className = "internship-card";
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${escapeHTML(internship.title)}</h3>
            </div>
            <p class="card-company"><strong>${escapeHTML(internship.company)}</strong></p>
            <div class="card-tags">
                <span class="tag domain">${escapeHTML(internship.domain)}</span>
                <span class="tag mode">${escapeHTML(internship.mode)}</span>
            </div>
            <p class="card-description">${escapeHTML(internship.description.substring(0, 100))}...</p>
            <div class="card-meta">
                <span>📍 ${escapeHTML(internship.location)}</span>
                <span>💰 ${escapeHTML(internship.stipend)}</span>
            </div>
            <div class="card-action">
                <button class="btn-primary">View Details</button>
            </div>
        `;

        card.querySelector(".btn-primary").addEventListener("click", () => {
            openDetailModal(internship);
        });

        internshipsList.appendChild(card);
    });
}

// DETAIL MODAL - OPEN
function openDetailModal(internship) {
    selectedInternship = internship;
    modalTitle.textContent = internship.title;
    modalBody.innerHTML = `
        <h3>${escapeHTML(internship.title)}</h3>
        <p><strong>Company:</strong> ${escapeHTML(internship.company)}</p>
        <p><strong>Domain:</strong> ${escapeHTML(internship.domain)}</p>
        <p><strong>Location:</strong> ${escapeHTML(internship.location)}</p>
        <p><strong>Mode:</strong> ${escapeHTML(internship.mode)}</p>
        <p><strong>Stipend:</strong> ${escapeHTML(internship.stipend)}</p>
        <p><strong>Duration:</strong> ${escapeHTML(internship.duration)}</p>
        <p><strong>Description:</strong></p>
        <p>${escapeHTML(internship.description)}</p>
    `;
    detailModal.showModal();
}

// DETAIL MODAL - CLOSE
function closeDetailModal() {
    detailModal.close();
    selectedInternship = null;
}

closeModal.addEventListener("click", closeDetailModal);
closeModalBtn.addEventListener("click", closeDetailModal);

// APPLICATION MODAL - OPEN
function openApplicationModal() {
    if (!selectedInternship) return;

    applicationForm.style.display = "block";
    appFormLoading.style.display = "none";
    appFormError.style.display = "none";
    appFormSuccess.style.display = "none";
    applicationForm.reset();

    document.getElementById("internship-id").value = selectedInternship.id;
    applicationModal.showModal();
}

// APPLICATION MODAL - CLOSE
function closeApplicationModal() {
    applicationModal.close();
}

applyBtn.addEventListener("click", openApplicationModal);
closeAppModal.addEventListener("click", closeApplicationModal);
closeAppModalBtn.addEventListener("click", closeApplicationModal);

// SUBMIT APPLICATION
applicationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const internshipId = document.getElementById("internship-id").value;
    const name = document.getElementById("app-name").value.trim();
    const email = document.getElementById("app-email").value.trim();
    const portfolio = document.getElementById("app-portfolio").value.trim();
    const coverLetter = document.getElementById("app-cover-letter").value.trim();

    // Validate
    if (!name) {
        showFormError("Name is required");
        return;
    }

    if (!email || !isValidEmail(email)) {
        showFormError("Valid email is required");
        return;
    }

    // Show loading
    applicationForm.style.display = "none";
    appFormLoading.style.display = "block";
    appFormError.style.display = "none";
    appFormSuccess.style.display = "none";

    try {
        const response = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                internship_id: internshipId,
                applicant_name: name,
                applicant_email: email,
                portfolio_url: portfolio || null,
                cover_letter: coverLetter || null
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed");
        }

        // Success
        applicationForm.style.display = "none";
        appFormLoading.style.display = "none";
        appFormError.style.display = "none";
        appFormSuccess.style.display = "block";

        setTimeout(() => {
            closeApplicationModal();
            closeDetailModal();
        }, 2000);

    } catch (error) {
        showFormError(error.message);
    }
});

function showFormError(msg) {
    applicationForm.style.display = "block";
    appFormLoading.style.display = "none";
    appFormError.style.display = "block";
    appFormError.innerHTML = `<p>❌ ${escapeHTML(msg)}</p>`;
    appFormSuccess.style.display = "none";
}

// SEARCH & FILTERS
function setupListeners() {
    if (searchInput) searchInput.addEventListener("input", () => { currentPage = 1; loadInternships(); });
    if (domainFilter) domainFilter.addEventListener("change", () => { currentPage = 1; loadInternships(); });
    if (modeFilter) modeFilter.addEventListener("change", () => { currentPage = 1; loadInternships(); });
    if (clearFilters) clearFilters.addEventListener("click", () => {
        searchInput.value = "";
        domainFilter.value = "";
        modeFilter.value = "";
        currentPage = 1;
        loadInternships();
    });

    if (retryButton) retryButton.addEventListener("click", loadInternships);
}

// PAGINATION
function updatePagination(paginationData) {
    if (!paginationData) return;

    const totalPages = paginationData.pages || 1;
    const page = paginationData.page || currentPage;

    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevPage.disabled = page <= 1;
    nextPage.disabled = page >= totalPages;
    pagination.hidden = totalPages <= 1;
}

prevPage.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadInternships();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

nextPage.addEventListener("click", () => {
    currentPage++;
    loadInternships();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// HELPERS
function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
