const allowedTaskTypes = ['water', 'fertilize', 'harvest', 'plant', 'prune', 'weed', 'inspect', 'treat', 'other', 'maintenance'];

// Field keys remain stable for clients; all message text is user-facing.
const getTaskFieldErrors = ({ title, due_date, garden_id, task_type }, { requireGarden = false } = {}) => {
  const errors = {};
  if (typeof title !== 'string' || !title.trim()) {
    errors.title = 'A task title is required.';
  } else if (Array.from(title).length > 255) {
    errors.title = 'The task title must be 255 characters or fewer.';
  }
  if (typeof due_date !== 'string' || !due_date.trim()) {
    errors.due_date = 'Select a due date.';
  }
  if (requireGarden && (!garden_id || (typeof garden_id === 'string' && !garden_id.trim()))) {
    errors.garden_id = 'Select a garden.';
  }
  // Omitted types retain the API's maintenance default for older clients.
  if (task_type !== undefined && !allowedTaskTypes.includes(task_type)) {
    errors.task_type = 'Choose a supported task type.';
  }
  return errors;
};

module.exports = { getTaskFieldErrors };
