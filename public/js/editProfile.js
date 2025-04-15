let experienceIndex = parseInt(document.getElementById('experienceIndexHolder')?.value || 0);

function addExperience() {
    const container = document.getElementById('experience-container');
    const html = `
    <div class="experience-card">
        <div class="form-input">
            <label>Position</label>
            <input type="text" name="experience[${experienceIndex}][position]">
        </div>
        <div class="form-input">
            <label>Company</label>
            <input type="text" name="experience[${experienceIndex}][company]">
        </div>
        <div class="input-group">
            <div class="form-input">
                <label>Start Date</label>
                <input type="date" name="experience[${experienceIndex}][startDate]">
            </div>
            <div class="form-input">
                <label>End Date</label>
                <input type="date" name="experience[${experienceIndex}][endDate]">
            </div>
        </div>
        <div class="form-input">
            <label>Description</label>
            <textarea name="experience[${experienceIndex}][description]"></textarea>
        </div>
    </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    experienceIndex++;
}