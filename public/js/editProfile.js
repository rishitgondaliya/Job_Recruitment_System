let experienceIndex = parseInt(document.getElementById('experienceIndexHolder')?.value || 0);

function addExperience() {
    const container = document.getElementById('experience-container');
    const div = document.createElement('div');
    div.className = 'experience-card';
    div.innerHTML = `
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
        <div class="remove-btn">
            <button type="button" class="btn">Remove</button>
        </div>
    `;

    // Attach event listener to remove button
    div.querySelector('.remove-btn').addEventListener('click', function() {
        div.remove();
    });

    container.appendChild(div);
    experienceIndex++;
}
