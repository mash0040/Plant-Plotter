-- Insert demo users with properly generated bcrypt hashes
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    role, 
    is_active, 
    email_verified,
    preferences
) VALUES 
-- Demo User (password: demo123)
('Demo User', 
 'demo@plantplotter.com', 
 '$2b$10$K8jJZZm9yWz1mLhzG3tg9.eJ1KMQn5FZsO7fUHpvh5Z4gkGzF2YfC', 
 'user', 
 TRUE, 
 TRUE,
 '{"theme": "light", "units": "metric", "notifications": true, "default_garden_size": "small"}'),

-- Admin User (password: admin123)
('Admin User', 
 'admin@plantplotter.com', 
 '$2b$10$gyD6Egf.nU2Uq/TpES6XeOki3iGDAy8b45DRRlPgmsV8N93Nv8EmC', 
 'admin', 
 TRUE, 
 TRUE,
 '{"theme": "dark", "units": "imperial", "notifications": true, "admin_dashboard": true}'),

-- Regular User (password: user123) 
('Regular User', 
 'user@plantplotter.com', 
 '$2b$10$3JRe9c4bJ0vHd1M7vNNoQeWZK8TS8nTDcw0qEq.HkU0b/x97GzQJq', 
 'user', 
 TRUE, 
 TRUE,
 '{"theme": "light", "units": "metric", "notifications": false, "beginner_mode": true}');

update users 
set preferences =  '{"language":"en", "theme": "light", "notifications": {"email":true,"push":false,"gardenRemainders":true,"weatherAlerts":true }, "privacy":{"profileVisible":true, "shareGardens":false}, "garden":{"defaultUnits": "metric", "autoSave":true, "gridSize":40}}'
where id = 1;

update users 
set preferences = '{"language":"en", "theme": "dark", "notifications": {"email":true,"push":true,"gardenRemainders":true,"weatherAlerts":true }, "privacy":{"profileVisible":true, "shareGardens":true}, "garden":{"defaultUnits": "imperial", "autoSave":true, "gridSize":40}}'
where id = 2;

update users 
set preferences = '{"language":"en", "theme": "light", "notifications": {"email":true,"push":false,"gardenRemainders":true,"weatherAlerts":true }, "privacy":{"profileVisible":true, "shareGardens":false}, "garden":{"defaultUnits": "metric", "autoSave":true, "gridSize":40}}'
where id = 3;


-- Insert some default plants in library
-- Insert companion plants data into plant_library table
-- Note: companion_plants and avoid_plants will be stored as JSON arrays

INSERT INTO plant_library (id, name, emoji, size, category, description, spacing, sunlight, water_needs, days_to_maturity, difficulty, companion_plants, avoid_plants) VALUES

-- VEGETABLES (38 plants)
('alliums', 'Alliums', '🧅', 1, 'vegetables', 'Onion family plants including garlic, onions, leeks', 6, 'Full Sun', 'Moderate', 90, 'Easy', 
 '["tomato", "pepper", "potato", "brassicas", "carrot"]', '["beans", "peas"]'),

('asparagus', 'Asparagus', '🌿', 2, 'vegetables', 'Perennial spear vegetable', 18, 'Full Sun', 'Moderate', 365, 'Hard', 
 '["tomato", "parsley"]', '["onion", "garlic", "potato"]'),

('beans_bush', 'Bush Beans', '🫘', 1, 'vegetables', 'Compact nitrogen-fixing legume', 6, 'Full Sun', 'Moderate', 55, 'Easy', 
 '["cucumber", "strawberry"]', '["soybean", "alfalfa"]'),

('beans_pole', 'Pole Beans', '🫘', 2, 'vegetables', 'Climbing nitrogen-fixing legume', 6, 'Full Sun', 'Moderate', 65, 'Easy', 
 '["radish", "corn"]', '["brassicas", "kohlrabi"]'),

('beans_fava', 'Fava Beans', '🫘', 2, 'vegetables', 'Cool-season protein-rich bean', 8, 'Partial Sun', 'Moderate', 80, 'Medium', 
 '["strawberry", "celery"]', '[]'),

('beets', 'Beets', '🔴', 1, 'vegetables', 'Sweet root vegetable with edible greens', 4, 'Full Sun', 'Moderate', 55, 'Easy', 
 '["beans_bush", "cabbage", "lettuce", "kohlrabi", "onion", "brassicas"]', '["beans_pole"]'),

('brassicas', 'Brassicas', '🥬', 2, 'vegetables', 'Cabbage family including broccoli, kale, cauliflower', 15, 'Full Sun', 'High', 70, 'Medium', 
 '["onion"]', '["mustard", "tomato", "pepper", "beans_pole", "strawberry"]'),

('broccoli', 'Broccoli', '🥦', 2, 'vegetables', 'Nutritious brassica with edible florets', 18, 'Partial Sun', 'High', 75, 'Medium', 
 '["lettuce"]', '[]'),

('brussels_sprouts', 'Brussels Sprouts', '🥬', 2, 'vegetables', 'Mini cabbage-like brassica', 24, 'Full Sun', 'High', 100, 'Hard', 
 '["sage", "thyme", "clover"]', '[]'),

('cabbage', 'Cabbage', '🥬', 2, 'vegetables', 'Large-headed brassica vegetable', 15, 'Full Sun', 'High', 70, 'Medium', 
 '["beans", "celery"]', '["grape"]'),

('carrot', 'Carrot', '🥕', 1, 'vegetables', 'Root vegetable rich in beta-carotene', 3, 'Full Sun', 'Moderate', 70, 'Easy', 
 '["tomato", "alliums", "beans", "leek", "lettuce", "onion"]', '["dill", "parsnip", "radish"]'),

('cauliflower', 'Cauliflower', '🥦', 2, 'vegetables', 'White-headed brassica vegetable', 18, 'Full Sun', 'High', 75, 'Hard', 
 '["beans", "celery", "spinach", "peas"]', '[]'),

('celery', 'Celery', '🥬', 1, 'vegetables', 'Crisp stalked vegetable', 8, 'Partial Sun', 'High', 85, 'Hard', 
 '["beans_bush", "brassicas", "cucumber"]', '["corn"]'),

('chard', 'Swiss Chard', '🥬', 1, 'vegetables', 'Colorful leafy green vegetable', 8, 'Partial Sun', 'Moderate', 50, 'Easy', 
 '["brassicas"]', '[]'),

('corn', 'Corn', '🌽', 3, 'vegetables', 'Tall grain producing cereal', 12, 'Full Sun', 'Moderate', 90, 'Medium', 
 '["beans", "cucurbits", "soybean", "tomato"]', '["tomato", "celery"]'),

('cucumber', 'Cucumber', '🥒', 2, 'vegetables', 'Vining fruit vegetable', 36, 'Full Sun', 'High', 60, 'Easy', 
 '["beans", "kohlrabi", "lettuce"]', '["potato"]'),

('cucurbits', 'Cucurbits', '🥒', 3, 'vegetables', 'Squash family including pumpkins, melons, gourds', 48, 'Full Sun', 'Moderate', 95, 'Medium', 
 '["corn"]', '[]'),

('eggplant', 'Eggplant', '🍆', 2, 'vegetables', 'Purple nightshade fruit', 24, 'Full Sun', 'Moderate', 80, 'Medium', 
 '["beans", "pepper", "tomato"]', '[]'),

('kohlrabi', 'Kohlrabi', '🟢', 1, 'vegetables', 'Bulbous stem brassica', 6, 'Full Sun', 'Moderate', 55, 'Easy', 
 '["onion", "beets", "cucumber"]', '[]'),

('leek', 'Leek', '🧅', 1, 'vegetables', 'Mild onion-family vegetable', 6, 'Full Sun', 'Moderate', 120, 'Medium', 
 '["carrot", "celery", "onion", "tomato"]', '["chard"]'),

('legumes', 'Legumes', '🫘', 1, 'vegetables', 'Bean and pea family nitrogen fixers', 6, 'Full Sun', 'Moderate', 60, 'Easy', 
 '["beets", "lettuce", "okra", "potato", "cabbage", "carrot", "chard", "eggplant", "peas", "tomato", "brassicas", "corn", "cucumber", "grape"]', '["alliums"]'),

('lettuce', 'Lettuce', '🥬', 1, 'vegetables', 'Cool-season leafy green', 8, 'Partial Sun', 'Moderate', 45, 'Easy', 
 '["beets", "beans", "okra", "onion", "radish", "broccoli", "carrot"]', '["celery", "cabbage", "parsley"]'),

('mustard', 'Mustard', '🌿', 1, 'vegetables', 'Peppery greens and seed crop', 6, 'Full Sun', 'Moderate', 40, 'Easy', 
 '["beans", "cabbage", "cauliflower", "radish", "brussels_sprouts", "turnip"]', '[]'),

('nightshades', 'Nightshades', '🍅', 2, 'vegetables', 'Tomato family including peppers, potatoes, eggplant', 24, 'Full Sun', 'Moderate', 80, 'Medium', 
 '["carrot", "alliums", "basil", "oregano"]', '["beans", "corn", "fennel", "dill", "brassicas"]'),

('okra', 'Okra', '🌶️', 2, 'vegetables', 'Heat-loving pod vegetable', 18, 'Full Sun', 'Moderate', 60, 'Easy', 
 '["sweet_potato", "tomato", "pepper"]', '[]'),

('onion', 'Onion', '🧅', 1, 'vegetables', 'Pungent bulb vegetable', 4, 'Full Sun', 'Moderate', 100, 'Easy', 
 '["beets", "brassicas", "cabbage", "broccoli", "carrot", "lettuce", "cucumber", "pepper", "strawberry"]', '["beans", "peas"]'),

('parsnip', 'Parsnip', '🥕', 1, 'vegetables', 'Sweet white root vegetable', 4, 'Full Sun', 'Moderate', 120, 'Medium', 
 '[]', '[]'),

('peas', 'Peas', '🟢', 1, 'vegetables', 'Cool-season climbing legume', 4, 'Partial Sun', 'Moderate', 65, 'Easy', 
 '["turnip", "cauliflower", "garlic"]', '[]'),

('pepper', 'Bell Pepper', '🫑', 2, 'vegetables', 'Sweet and colorful peppers', 18, 'Full Sun', 'Moderate', 70, 'Medium', 
 '["okra"]', '["beans", "cabbage", "brussels_sprouts"]'),

('potato', 'Potato', '🥔', 2, 'vegetables', 'Starchy tuber vegetable', 12, 'Full Sun', 'Moderate', 80, 'Medium', 
 '["brassicas", "beans", "corn", "peas"]', '["carrot", "cucumber", "pumpkin", "raspberry", "squash", "sunflower", "tomato"]'),

('pumpkin', 'Pumpkin', '🎃', 3, 'vegetables', 'Large orange winter squash', 60, 'Full Sun', 'Moderate', 110, 'Medium', 
 '["corn", "beans"]', '["potato"]'),

('radish', 'Radish', '🔴', 1, 'vegetables', 'Quick-growing root vegetable', 2, 'Full Sun', 'Moderate', 25, 'Easy', 
 '["squash", "eggplant", "cucumber", "lettuce", "peas", "beans", "beans_pole"]', '["grape"]'),

('soybean', 'Soybean', '🫘', 1, 'vegetables', 'Protein-rich Asian legume', 6, 'Full Sun', 'Moderate', 100, 'Medium', 
 '["corn", "sunflower"]', '[]'),

('spinach', 'Spinach', '🥬', 1, 'vegetables', 'Nutritious leafy green', 6, 'Partial Sun', 'Moderate', 40, 'Easy', 
 '["brassicas"]', '[]'),

('squash', 'Squash', '🥒', 3, 'vegetables', 'Sprawling vine fruit vegetable', 48, 'Full Sun', 'Moderate', 95, 'Medium', 
 '["corn", "beans", "okra"]', '[]'),

('sweet_potato', 'Sweet Potato', '🍠', 2, 'vegetables', 'Orange vine tuber vegetable', 18, 'Full Sun', 'Moderate', 100, 'Medium', 
 '["okra"]', '[]'),

('tomato', 'Tomato', '🍅', 2, 'vegetables', 'Popular garden vegetable', 24, 'Full Sun', 'High', 75, 'Medium', 
 '["celery", "pepper", "asparagus"]', '["corn", "fennel", "pepper", "peas", "dill", "potato", "beets", "brassicas", "rosemary"]'),

('turnip', 'Turnip', '🔵', 1, 'vegetables', 'White root brassica vegetable', 4, 'Full Sun', 'Moderate', 50, 'Easy', 
 '["peas", "broccoli"]', '[]'),

-- FRUITS (13 plants)
('apple', 'Apple', '🍎', 4, 'fruits', 'Popular tree fruit', 240, 'Full Sun', 'Moderate', 1825, 'Hard', 
 '[]', '[]'),

('apricot', 'Apricot', '🍑', 4, 'fruits', 'Sweet stone fruit', 180, 'Full Sun', 'Moderate', 1095, 'Hard', 
 '[]', '["pepper"]'),

('blueberry', 'Blueberry', '🫐', 3, 'fruits', 'Antioxidant-rich berry bush', 60, 'Partial Sun', 'High', 730, 'Hard', 
 '["strawberry"]', '["tomato"]'),

('fruit_trees', 'Fruit Trees', '🌳', 4, 'fruits', 'General fruit tree category', 200, 'Full Sun', 'Moderate', 1460, 'Hard', 
 '["alliums", "nasturtium", "marigold"]', '[]'),

('grape', 'Grape', '🍇', 3, 'fruits', 'Climbing vine fruit', 96, 'Full Sun', 'Moderate', 730, 'Hard', 
 '["hyssop", "basil", "beans", "chives", "oregano", "peas"]', '["cabbage", "garlic", "radish"]'),

('melon', 'Melon', '🍈', 3, 'fruits', 'Sweet vine fruit', 48, 'Full Sun', 'High', 85, 'Medium', 
 '["chamomile", "summer_savory"]', '[]'),

('passion_fruit', 'Passion Fruit', '💜', 3, 'fruits', 'Tropical climbing vine fruit', 72, 'Full Sun', 'High', 365, 'Hard', 
 '["potato", "beets", "chard", "carrot", "spinach", "strawberry", "eggplant", "onion", "leek", "lettuce"]', '["cucurbits", "corn", "okra", "sweet_potato"]'),

('pear', 'Pear', '🍐', 4, 'fruits', 'Sweet tree fruit', 200, 'Full Sun', 'Moderate', 1460, 'Hard', 
 '[]', '[]'),

('strawberry', 'Strawberry', '🍓', 1, 'fruits', 'Sweet perennial berry', 14, 'Full Sun', 'Moderate', 90, 'Medium', 
 '["beans_bush", "lettuce", "onion", "spinach"]', '["brassicas", "tomato", "potato", "eggplant", "pepper", "melon", "okra"]'),
 
 ('raspberry', 'Raspberry', '🍇', 2, 'fruits', 'Perennial berry canes', 36, 'Full Sun', 'Moderate', 365, 'Medium', 
 '["strawberry", "garlic", "chives"]', '["potato", "tomato", "eggplant", "pepper"]'),
 
('cherry', 'Cherry', '🍒', 4, 'fruits', 'Sweet or sour stone fruit tree', 200, 'Full Sun', 'Moderate', 1460, 'Hard', 
 '["garlic", "chives"]', '["walnut_tree"]'),
 
('peach', 'Peach', '🍑', 4, 'fruits', 'Sweet stone fruit tree', 200, 'Full Sun', 'Moderate', 1460, 'Hard', 
 '["basil", "tansy"]', '["walnut_tree"]'),
 
('fig', 'Fig', '🟤', 4, 'fruits', 'Mediterranean fruit tree', 180, 'Full Sun', 'Moderate', 730, 'Medium', 
 '["nasturtium", "comfrey"]', '[]'),

-- HERBS (30 plants)
('anise', 'Anise', '🌿', 1, 'herbs', 'Licorice-flavored herb', 8, 'Full Sun', 'Moderate', 120, 'Medium', 
 '[]', '[]'),

('basil', 'Basil', '🌿', 1, 'herbs', 'Aromatic herb perfect for cooking', 12, 'Full Sun', 'Moderate', 60, 'Easy', 
 '["tomato", "pepper", "oregano", "asparagus", "petunia", "grape"]', '[]'),

('borage', 'Borage', '💙', 1, 'herbs', 'Blue-flowered beneficial herb', 12, 'Full Sun', 'Moderate', 60, 'Easy', 
 '["beans", "strawberry", "cucumber", "squash", "fruit_trees", "tomato", "cabbage"]', '[]'),

('caraway', 'Caraway', '🌿', 1, 'herbs', 'Aromatic seed herb', 8, 'Full Sun', 'Moderate', 70, 'Medium', 
 '["strawberry"]', '["dill"]'),

('catnip', 'Catnip', '🌿', 1, 'herbs', 'Cat-attracting pest-repelling herb', 12, 'Full Sun', 'Low', 90, 'Easy', 
 '["eggplant"]', '[]'),

('chamomile', 'Chamomile', '🌼', 1, 'herbs', 'Calming tea herb with tiny flowers', 8, 'Full Sun', 'Moderate', 65, 'Easy', 
 '["brassicas", "cucumber", "onion", "cabbage"]', '[]'),

('chervil', 'Chervil', '🌿', 1, 'herbs', 'Delicate parsley-like herb', 6, 'Partial Sun', 'Moderate', 60, 'Medium', 
 '["radish", "lettuce", "broccoli"]', '[]'),

('chives', 'Chives', '🌿', 1, 'herbs', 'Mild onion-flavored herb', 6, 'Full Sun', 'Moderate', 90, 'Easy', 
 '["apple", "carrot", "grape", "tomato", "broccoli", "cabbage"]', '["beans", "peas"]'),

('cilantro', 'Cilantro', '🌿', 1, 'herbs', 'Fresh coriander leaf herb', 6, 'Full Sun', 'Moderate', 45, 'Easy', 
 '["anise", "cabbage", "spinach", "lettuce", "tomato"]', '[]'),

('dill', 'Dill', '🌿', 1, 'herbs', 'Feathery aromatic herb', 8, 'Full Sun', 'Moderate', 70, 'Easy', 
 '["brassicas", "cabbage", "corn", "fennel", "lettuce", "onion", "cucumber"]', '["carrot"]'),

('fennel', 'Fennel', '🌿', 2, 'herbs', 'Licorice-flavored bulb herb', 12, 'Full Sun', 'Moderate', 85, 'Medium', 
 '["dill"]', '[]'),

('flax', 'Flax', '💙', 1, 'herbs', 'Fiber and seed producing plant', 6, 'Full Sun', 'Moderate', 110, 'Medium', 
 '["carrot", "potato"]', '[]'),

('garlic', 'Garlic', '🧄', 1, 'herbs', 'Pungent bulb herb', 6, 'Full Sun', 'Moderate', 240, 'Easy', 
 '["brassicas", "beets", "tomato", "cucumber", "lettuce", "celery", "peas", "potato"]', '["grape"]'),

('hyssop', 'Hyssop', '💜', 1, 'herbs', 'Aromatic medicinal herb', 12, 'Full Sun', 'Low', 120, 'Medium', 
 '["brassicas", "cabbage", "grape"]', '["radish"]'),

('lavender', 'Lavender', '💜', 2, 'herbs', 'Fragrant purple flowering herb', 18, 'Full Sun', 'Low', 90, 'Medium', 
 '["chamomile", "lettuce", "brassicas", "onion", "tomato", "oregano", "thyme", "sage", "rosemary", "basil"]', '[]'),

('lemongrass', 'Lemongrass', '🌿', 2, 'herbs', 'Citrusy tropical grass herb', 24, 'Full Sun', 'Moderate', 100, 'Medium', 
 '["eggplant"]', '[]'),

('lovage', 'Lovage', '🌿', 2, 'herbs', 'Celery-flavored perennial herb', 24, 'Partial Sun', 'Moderate', 90, 'Medium', 
 '["beans"]', '[]'),

('oregano', 'Oregano', '🌿', 1, 'herbs', 'Pungent Mediterranean herb', 10, 'Full Sun', 'Low', 80, 'Easy', 
 '["grape", "tomato", "pepper", "pumpkin"]', '[]'),

('parsley', 'Parsley', '🌿', 1, 'herbs', 'Popular garnish and cooking herb', 6, 'Partial Sun', 'Moderate', 75, 'Easy', 
 '["asparagus", "corn", "tomato"]', '["alliums", "lettuce"]'),

('peppermint', 'Peppermint', '🌿', 1, 'herbs', 'Cool menthol-flavored herb', 12, 'Partial Sun', 'High', 90, 'Easy', 
 '["alliums", "brassicas", "cabbage", "peas", "tomato"]', '[]'),

('rosemary', 'Rosemary', '🌿', 2, 'herbs', 'Woody Mediterranean herb', 24, 'Full Sun', 'Low', 180, 'Medium', 
 '["cabbage", "beans", "brassicas", "carrot", "thyme"]', '[]'),

('sage', 'Sage', '🌿', 1, 'herbs', 'Earthy culinary and medicinal herb', 18, 'Full Sun', 'Low', 75, 'Easy', 
 '["brassicas", "rosemary", "cabbage", "beans", "brussels_sprouts", "carrot", "strawberry", "tomato"]', '[]'),

('southernwood', 'Southernwood', '🌿', 2, 'herbs', 'Artemisia family pest repelling herb', 24, 'Full Sun', 'Low', 120, 'Medium', 
 '["brassicas", "fruit_trees"]', '[]'),

('spearmint', 'Spearmint', '🌿', 1, 'herbs', 'Sweet mint-flavored herb', 12, 'Partial Sun', 'High', 90, 'Easy', 
 '["alliums", "brassicas", "cabbage", "peas", "tomato"]', '[]'),

('stinging_nettle', 'Stinging Nettle', '🌿', 2, 'herbs', 'Mineral-rich wild herb', 18, 'Partial Sun', 'High', 90, 'Medium', 
 '["chamomile", "peppermint", "broccoli", "tomato"]', '[]'),

('summer_savory', 'Summer Savory', '🌿', 1, 'herbs', 'Peppery bean companion herb', 8, 'Full Sun', 'Moderate', 70, 'Easy', 
 '["beans", "melon", "onion"]', '[]'),

('tarragon', 'Tarragon', '🌿', 1, 'herbs', 'Anise-flavored perennial herb', 12, 'Full Sun', 'Low', 120, 'Medium', 
 '["eggplant"]', '[]'),

('thyme', 'Thyme', '🌿', 1, 'herbs', 'Tiny-leafed aromatic herb', 8, 'Full Sun', 'Low', 90, 'Easy', 
 '["brassicas", "cabbage", "eggplant", "potato", "strawberry", "tomato", "brussels_sprouts"]', '[]'),

('wormwood', 'Wormwood', '🌿', 2, 'herbs', 'Bitter pest-repelling herb', 24, 'Full Sun', 'Low', 120, 'Medium', 
 '["brassicas", "carrot"]', '[]'),

('yarrow', 'Yarrow', '🌻', 1, 'herbs', 'Beneficial insect-attracting herb', 12, 'Full Sun', 'Low', 120, 'Easy', 
 '[]', '[]'),

-- FLOWERS (19 plants)
('alyssum', 'Sweet Alyssum', '⚪', 1, 'flowers', 'Tiny white ground-cover flower', 6, 'Full Sun', 'Moderate', 50, 'Easy', 
 '["lettuce"]', '[]'),

('baby_breath', 'Baby\'s Breath', '🤍', 1, 'flowers', 'Delicate white filler flower', 8, 'Full Sun', 'Low', 80, 'Easy', 
 '[]', '[]'),

('bee_balm', 'Bee Balm', '🌺', 1, 'flowers', 'Red pollinator-attracting flower', 12, 'Full Sun', 'Moderate', 90, 'Medium', 
 '["tomato"]', '[]'),

('california_poppy', 'California Poppy', '🧡', 1, 'flowers', 'Bright orange drought-tolerant flower', 8, 'Full Sun', 'Low', 60, 'Easy', 
 '[]', '[]'),

('dianthus', 'Dianthus', '🌸', 1, 'flowers', 'Fragrant carnation-family flower', 8, 'Full Sun', 'Moderate', 75, 'Easy', 
 '[]', '[]'),

('geranium', 'Geranium', '🌺', 1, 'flowers', 'Colorful pest-repelling flower', 12, 'Full Sun', 'Moderate', 90, 'Easy', 
 '["corn", "pepper", "grape"]', '["tomato", "eggplant"]'),

('larkspur', 'Larkspur', '💙', 2, 'flowers', 'Tall spiky blue flower', 12, 'Full Sun', 'Moderate', 120, 'Medium', 
 '["beans", "cabbage"]', '[]'),

('lupin', 'Lupin', '💜', 2, 'flowers', 'Tall spiky nitrogen-fixing flower', 18, 'Full Sun', 'Moderate', 100, 'Medium', 
 '["strawberry"]', '["tomato"]'),

('marigold', 'Marigold', '🌼', 1, 'flowers', 'Pest-repelling companion flower', 8, 'Full Sun', 'Low', 50, 'Easy', 
 '["tomato", "pepper", "cucumber", "squash", "potato", "alliums", "brassicas"]', '[]'),

('nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 'Edible flower that repels pests', 12, 'Full Sun', 'Low', 55, 'Easy', 
 '["beans", "squash", "tomato", "fruit_trees", "brassicas", "radish", "cucumber"]', '["cauliflower"]'),

('pansy', 'Pansy', '💜', 1, 'flowers', 'Edible cool-season flower', 6, 'Partial Sun', 'Moderate', 70, 'Easy', 
 '["alliums", "onion"]', '[]'),

('petunia', 'Petunia', '🌺', 1, 'flowers', 'Colorful pest-repelling flower', 8, 'Full Sun', 'Moderate', 80, 'Easy', 
 '["squash", "pumpkin", "cucumber", "asparagus"]', '[]'),

('phacelia', 'Phacelia', '💜', 1, 'flowers', 'Beneficial pollinator flower', 8, 'Full Sun', 'Moderate', 75, 'Easy', 
 '["lettuce", "tomato"]', '[]'),

('rose', 'Rose', '🌹', 2, 'flowers', 'Classic fragrant flower', 36, 'Full Sun', 'Moderate', 365, 'Hard', 
 '[]', '[]'),

('sunflower', 'Sunflower', '🌻', 3, 'flowers', 'Tall beneficial insect-attracting flower', 24, 'Full Sun', 'Moderate', 85, 'Easy', 
 '["pepper", "corn", "cucumber", "soybean", "tomato"]', '["beans_pole"]'),

('swan_plant', 'Swan Plant', '🦢', 2, 'flowers', 'Milkweed family butterfly attracting flower', 18, 'Full Sun', 'Low', 120, 'Medium', 
 '["sunflower"]', '[]'),

('sweet_pea', 'Sweet Pea', '🌸', 1, 'flowers', 'Fragrant climbing flower', 6, 'Partial Sun', 'Moderate', 85, 'Easy', 
 '[]', '[]'),

('tansy', 'Tansy', '🌻', 1, 'flowers', 'Yellow pest-repelling flower', 12, 'Full Sun', 'Low', 120, 'Easy', 
 '["beans", "cucumber", "squash", "corn", "fruit_trees"]', '[]'),

('zinnia', 'Zinnia', '🌺', 1, 'flowers', 'Colorful cutting flower', 8, 'Full Sun', 'Moderate', 75, 'Easy', 
 '["beans", "tomato", "pepper"]', '[]'),

-- OTHER (3 plants)
('alfalfa', 'Alfalfa', '💜', 2, 'other', 'Nitrogen-fixing forage crop', 12, 'Full Sun', 'Moderate', 90, 'Medium', 
 '[]', '["tomato", "beans_fava"]'),

('peanut', 'Peanut', '🥜', 1, 'other', 'Underground legume nut crop', 8, 'Full Sun', 'Moderate', 120, 'Medium', 
 '["beans", "corn", "cucumber", "eggplant", "lettuce", "marigold", "melon", "sunflower"]', '[]'),

('walnut_tree', 'Walnut Tree', '🌰', 4, 'other', 'Large nut-producing tree with allelopathic properties', 480, 'Full Sun', 'Moderate', 2555, 'Hard', 
 '[]', '["apple", "tomato", "potato", "pepper", "eggplant", "pine"]');

-- Update existing default plants with companion information
UPDATE plant_library SET 
    companion_plants = '["basil", "oregano", "parsley", "chives", "carrot", "celery", "nasturtium", "marigold", "borage", "asparagus"]',
    avoid_plants = '["corn", "fennel", "brassicas", "potato", "dill", "rosemary"]'
WHERE id = 'tomato';

UPDATE plant_library SET 
    companion_plants = '["tomato", "oregano", "parsley", "chives", "nasturtium", "marigold", "petunia", "geranium", "okra", "beans", "eggplant"]',
    avoid_plants = '["beans", "cabbage", "brassicas", "brussels_sprouts"]'
WHERE id = 'pepper';

UPDATE plant_library SET 
    companion_plants = '["radish", "onion", "chives", "dill", "lettuce", "beans", "cucumber", "nasturtium", "tomato", "alliums", "leek"]',
    avoid_plants = '["parsnip", "dill"]'
WHERE id = 'carrot';

UPDATE plant_library SET 
    companion_plants = '["radish", "beets", "dill", "onion", "beans", "carrot", "cucumber", "strawberry", "broccoli", "thyme", "nasturtium", "alyssum", "okra"]',
    avoid_plants = '["celery", "cabbage", "parsley"]'
WHERE id = 'lettuce';

UPDATE plant_library SET 
    companion_plants = '["beans_bush", "lettuce", "onion", "sage", "thyme", "borage", "caraway", "spinach"]',
    avoid_plants = '["brassicas", "tomato", "potato", "eggplant", "pepper", "melon", "okra", "mint"]'
WHERE id = 'strawberry';

UPDATE plant_library SET 
    companion_plants = '["tomato", "pepper", "cucumber", "nasturtium", "borage", "catnip", "alyssum", "zinnia", "squash", "potato", "alliums", "brassicas"]',
    avoid_plants = '[]'
WHERE id = 'marigold';



INSERT INTO gardens (id, user_id, name, description, width, height, grid_size, soil_type, location, status, plant_count) VALUES
-- Demo User Gardens (user_id = 1) - Rich sample data
(1, 1, 'Main Vegetable Garden', 'Large productive vegetable garden with diverse crops and companion planting', 16, 12, 40, 'Loamy', 'Backyard', 'Active', 15),
(2, 1, 'Mixed Berry & Flower Garden', 'Diverse garden combining berry bushes, flowers, and companion herbs', 14, 10, 40, 'Sandy', 'Front yard', 'Active', 13),
(3, 1, 'Culinary Herb Collection', 'Comprehensive herb garden with cooking essentials and specialty varieties', 8, 8, 40, 'Loamy', 'Kitchen garden', 'Active', 12),
(4, 1, 'Young Orchard', 'Developing fruit tree collection with understory plantings', 20, 15, 40, 'Clay', 'Side yard', 'Active', 11),
(5, 1, 'Intensive Container Garden', 'Maximized small-space gardening with succession planting', 6, 4, 40, 'Loamy', 'Apartment balcony', 'Active', 14),
-- Admin User Garden (user_id = 2) - Empty for testing
(6, 2, 'Admin Test Garden', 'Empty garden for admin user testing', 10, 8, 40, 'Loamy', 'Test Location', 'Planning', 0),
-- Regular User Garden (user_id = 3) - Empty for new users
(7, 3, 'My First Garden', 'Starter garden for regular user', 8, 6, 40, 'Loamy', 'Backyard', 'Planning', 0);


INSERT INTO planted_items (id, garden_id, plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, planted_date, notes) VALUES

-- Garden 1: Main Vegetable Garden (15 plants)
(1, 1, 'tomato', 'Tomato', '🍅', 2, 'vegetables', 2, 1, '2024-11-01', 'Cherry tomato variety, caged for support'),
(2, 1, 'basil', 'Basil', '🌿', 1, 'herbs', 4, 1, '2024-11-05', 'Companion plant with tomatoes'),
(3, 1, 'lettuce', 'Lettuce', '🥬', 1, 'vegetables', 0, 3, '2024-10-20', 'Butterhead variety'),
(4, 1, 'carrot', 'Carrot', '🥕', 1, 'vegetables', 1, 3, '2024-10-15', 'Orange variety, deep loose soil'),
(5, 1, 'radish', 'Radish', '🔴', 1, 'vegetables', 2, 3, '2024-11-25', 'Quick growing, intercropped with carrots'),
(6, 1, 'pepper', 'Bell Pepper', '🫑', 2, 'vegetables', 6, 2, '2024-11-10', 'Red bell pepper, needs warm weather'),
(7, 1, 'oregano', 'Oregano', '🌿', 1, 'herbs', 8, 2, '2024-10-25', 'Mediterranean variety, drought tolerant'),
(8, 1, 'spinach', 'Spinach', '🥬', 1, 'vegetables', 0, 5, '2024-10-30', 'Cold weather crop'),
(9, 1, 'broccoli', 'Broccoli', '🥦', 2, 'vegetables', 2, 5, '2024-10-10', 'Fall planting, cool weather preferred'),
(10, 1, 'parsley', 'Parsley', '🌿', 1, 'herbs', 4, 6, '2024-10-20', 'Flat-leaf variety, biennial'),
(11, 1, 'cucumber', 'Cucumber', '🥒', 2, 'vegetables', 10, 4, '2024-11-15', 'Climbing variety with trellis'),
(12, 1, 'squash', 'Squash', '🥒', 3, 'vegetables', 6, 8, '2024-11-20', 'Summer squash, very productive'),
(13, 1, 'marigold', 'Marigold', '🌼', 1, 'flowers', 0, 0, '2024-10-01', 'Pest deterrent border plant'),
(14, 1, 'nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 9, 0, '2024-10-05', 'Edible flowers, aphid trap crop'),
(15, 1, 'cilantro', 'Cilantro', '🌿', 1, 'herbs', 14, 2, '2024-11-01', 'Cool weather herb, succession planted'),

-- Garden 2: Mixed Berry & Flower Garden (13 plants)
(16, 2, 'strawberry', 'Strawberry', '🍓', 1, 'fruits', 1, 1, '2024-09-15', 'Ever-bearing variety, June harvest'),
(17, 2, 'strawberry', 'Strawberry', '🍓', 1, 'fruits', 3, 1, '2024-09-15', 'Second strawberry plant for better yield'),
(18, 2, 'strawberry', 'Strawberry', '🍓', 1, 'fruits', 5, 1, '2024-09-15', 'Third strawberry for full bed'),
(19, 2, 'blueberry', 'Blueberry', '🫐', 3, 'fruits', 8, 2, '2024-08-01', 'Highbush variety, acidic soil added'),
-- Note: raspberry is not in plant_library, using strawberry as placeholder or consider adding raspberry to plant_library
(20, 2, 'strawberry', 'Raspberry', '🍇', 2, 'fruits', 2, 4, '2024-07-20', 'Red raspberry canes, summer bearing - NOTE: Using strawberry ID as raspberry not in library'),
(21, 2, 'strawberry', 'Raspberry', '🍇', 2, 'fruits', 4, 4, '2024-07-20', 'Second raspberry for better production - NOTE: Using strawberry ID as raspberry not in library'),
(22, 2, 'lavender', 'Lavender', '💜', 2, 'herbs', 0, 7, '2024-08-15', 'English lavender, drought tolerant'),
(23, 2, 'lavender', 'Lavender', '💜', 2, 'herbs', 3, 7, '2024-08-15', 'Second lavender for hedge effect'),
(24, 2, 'rose', 'Rose Bush', '🌹', 2, 'flowers', 10, 6, '2024-07-01', 'Hybrid tea rose, needs regular feeding'),
(25, 2, 'marigold', 'Marigold', '🌼', 1, 'flowers', 6, 3, '2024-09-20', 'French marigold, natural pest control'),
(26, 2, 'marigold', 'Marigold', '🌼', 1, 'flowers', 11, 4, '2024-09-20', 'Companion for roses'),
(27, 2, 'thyme', 'Thyme', '🌿', 1, 'herbs', 12, 1, '2024-08-30', 'Creeping thyme groundcover'),
(28, 2, 'rosemary', 'Rosemary', '🌿', 2, 'herbs', 6, 8, '2024-08-20', 'Upright rosemary, winter hardy'),

-- Garden 3: Culinary Herb Collection (12 plants)
(29, 3, 'basil', 'Basil', '🌿', 1, 'herbs', 1, 1, '2024-10-01', 'Genovese basil for pesto'),
(30, 3, 'basil', 'Basil', '🌿', 1, 'herbs', 2, 1, '2024-10-01', 'Thai basil variety'),
(31, 3, 'oregano', 'Oregano', '🌿', 1, 'herbs', 4, 1, '2024-09-25', 'Greek oregano, very flavorful'),
(32, 3, 'thyme', 'Thyme', '🌿', 1, 'herbs', 6, 1, '2024-09-25', 'Common thyme'),
(33, 3, 'rosemary', 'Rosemary', '🌿', 2, 'herbs', 1, 3, '2024-09-20', 'Upright variety, cold hardy'),
(34, 3, 'parsley', 'Parsley', '🌿', 1, 'herbs', 4, 3, '2024-10-05', 'Flat-leaf Italian parsley'),
(35, 3, 'parsley', 'Parsley', '🌿', 1, 'herbs', 5, 3, '2024-10-05', 'Curly parsley for garnish'),
(36, 3, 'cilantro', 'Cilantro', '🌿', 1, 'herbs', 0, 5, '2024-09-30', 'Slow-bolt variety'),
(37, 3, 'cilantro', 'Cilantro', '🌿', 1, 'herbs', 1, 5, '2024-10-15', 'Second succession planting'),
(38, 3, 'spearmint', 'Mint', '🌿', 1, 'herbs', 3, 5, '2024-09-30', 'Spearmint in container to control spread'),
(39, 3, 'peppermint', 'Mint', '🌿', 1, 'herbs', 4, 5, '2024-09-30', 'Peppermint variety'),
(40, 3, 'lavender', 'Lavender', '💜', 2, 'flowers', 6, 5, '2024-08-15', 'Culinary lavender for tea and baking'),

-- Garden 4: Young Orchard (11 plants)
(41, 4, 'apple', 'Apple Tree', '🍎', 4, 'fruits', 3, 3, '2024-04-15', 'Honeycrisp variety, dwarf rootstock'),
(42, 4, 'apple', 'Apple Tree', '🍎', 4, 'fruits', 10, 3, '2024-04-15', 'Gala variety, cross-pollinator'),
(43, 4, 'pear', 'Pear Tree', '🍐', 4, 'fruits', 16, 3, '2024-04-20', 'Bartlett pear, needs cross-pollination'),
-- Note: cherry, peach, fig are not in plant_library, using closest alternatives
(44, 4, 'apricot', 'Cherry Tree', '🍒', 4, 'fruits', 3, 10, '2024-05-01', 'Sweet cherry, self-pollinating variety - NOTE: Using apricot ID as cherry not in library'),
(45, 4, 'apricot', 'Peach Tree', '🍑', 4, 'fruits', 10, 10, '2024-05-05', 'Freestone peach, disease resistant - NOTE: Using apricot ID as peach not in library'),
(46, 4, 'fruit_trees', 'Fig Tree', '🟤', 4, 'fruits', 16, 10, '2024-05-10', 'Brown Turkey fig, cold hardy - NOTE: Using fruit_trees ID as fig not in library'),
(47, 4, 'nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 1, 1, '2024-08-01', 'Ground cover around apple tree'),
(48, 4, 'nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 8, 1, '2024-08-01', 'Beneficial insect attractor'),
(49, 4, 'nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 14, 1, '2024-08-01', 'Understory planting'),
(50, 4, 'nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 1, 8, '2024-08-01', 'Edible flowers for salads'),
(51, 4, 'nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 18, 8, '2024-08-01', 'Natural pest deterrent'),

-- Garden 5: Intensive Container Garden (14 plants)
(52, 5, 'lettuce', 'Lettuce', '🥬', 1, 'vegetables', 0, 0, '2024-11-15', 'Buttercrunch lettuce'),
(53, 5, 'lettuce', 'Lettuce', '🥬', 1, 'vegetables', 1, 0, '2024-11-15', 'Red oak leaf lettuce'),
(54, 5, 'spinach', 'Spinach', '🥬', 1, 'vegetables', 2, 0, '2024-11-10', 'Baby spinach for salads'),
(55, 5, 'radish', 'Radish', '🔴', 1, 'vegetables', 3, 0, '2024-11-20', 'Cherry belle radish'),
(56, 5, 'radish', 'Radish', '🔴', 1, 'vegetables', 4, 0, '2024-11-25', 'Second succession planting'),
(57, 5, 'cilantro', 'Cilantro', '🌿', 1, 'herbs', 0, 1, '2024-11-10', 'Slow-bolt variety'),
(58, 5, 'basil', 'Basil', '🌿', 1, 'herbs', 1, 1, '2024-11-05', 'Compact bush basil'),
(59, 5, 'parsley', 'Parsley', '🌿', 1, 'herbs', 2, 1, '2024-10-30', 'Flat-leaf parsley'),
(60, 5, 'thyme', 'Thyme', '🌿', 1, 'herbs', 3, 1, '2024-10-25', 'French thyme in small pot'),
(61, 5, 'strawberry', 'Strawberry', '🍓', 1, 'fruits', 0, 2, '2024-10-01', 'Day-neutral variety'),
(62, 5, 'strawberry', 'Strawberry', '🍓', 1, 'fruits', 1, 2, '2024-10-01', 'Alpine strawberry'),
(63, 5, 'pepper', 'Bell Pepper', '🫑', 2, 'vegetables', 3, 2, '2024-10-15', 'Compact bell pepper variety'),
(64, 5, 'marigold', 'Marigold', '🌼', 1, 'flowers', 0, 3, '2024-10-20', 'Dwarf marigold for pest control'),
(65, 5, 'nasturtium', 'Nasturtium', '🌸', 1, 'flowers', 5, 3, '2024-10-18', 'Trailing variety in hanging container');


INSERT INTO garden_activities (id, garden_id, user_id, activity_type, plant_name, activity_date, activity_time, notes) VALUES
-- Recent activities (July 2025)
(1, 1, 1, 'watered', 'Tomato', '2025-07-23', '07:00:00', 'Morning watering for main vegetable garden'),
(2, 3, 1, 'harvested', 'Basil', '2025-07-23', '18:30:00', 'Fresh basil for dinner'),
(3, 1, 1, 'planted', 'Lettuce', '2025-07-22', '09:00:00', 'Succession planting for continuous harvest'),
(4, 2, 1, 'fertilized', 'Strawberry', '2025-07-21', '10:15:00', 'Organic fertilizer for berry garden'),
(5, 3, 1, 'watered', 'Rosemary', '2025-07-21', '07:30:00', 'Light watering for herb collection'),
(6, 1, 1, 'harvested', 'Carrot', '2025-07-19', '18:45:00', 'Perfect size carrots ready!'),
(7, 4, 1, 'watered', 'Apple Tree', '2025-07-19', '19:00:00', 'Deep watering for young orchard'),
(8, 5, 1, 'planted', 'Cilantro', '2025-07-17', '14:30:00', 'Added to container garden'),
-- June activities
(9, 1, 1, 'fertilized', 'Bell Pepper', '2025-06-14', '09:30:00', 'Calcium boost for better fruit set'),
(10, 2, 1, 'watered', 'Lavender', '2025-06-12', '07:15:00', 'Light watering - drought tolerant'),
(11, 5, 1, 'harvested', 'Spinach', '2025-06-12', '18:30:00', 'Baby spinach for salads'),
(12, 4, 1, 'planted', 'Nasturtium', '2025-06-10', '10:00:00', 'Companion planting around fruit trees'),
(13, 2, 1, 'harvested', 'Strawberry', '2025-06-07', '08:00:00', 'Sweet summer strawberries!'),
-- May activities
(14, 1, 1, 'harvested', 'Tomato', '2025-05-30', '08:00:00', 'Peak harvest season - plenty of ripe tomatoes!'),
(15, 1, 1, 'watered', 'Bell Pepper', '2025-05-30', '18:30:00', 'Extra water during hot weather'),
(16, 1, 1, 'fertilized', 'Cucumber', '2025-05-28', '09:15:00', 'Liquid fertilizer for heavy producing vines'),
(17, 1, 1, 'harvested', 'Zucchini', '2025-05-25', '07:30:00', 'Daily harvest to keep plants producing'),
(18, 2, 1, 'watered', 'Strawberry', '2025-05-25', '20:00:00', 'Evening watering to avoid heat stress'),
(19, 5, 1, 'planted', 'Spinach', '2025-05-22', '06:00:00', 'Spring planting for cool weather crop'),
(20, 2, 1, 'harvested', 'Blueberry', '2025-05-20', '07:45:00', 'Late spring blueberry harvest'),
-- April activities
(21, 4, 1, 'fertilized', 'Apple Tree', '2025-04-20', '17:30:00', 'Spring feeding for fruit trees'),
(22, 3, 1, 'watered', 'Basil', '2025-04-18', '07:00:00', 'Keep herbs well watered'),
(23, 3, 1, 'harvested', 'Oregano', '2025-04-15', '18:15:00', 'Fresh herbs for cooking'),
(24, 1, 1, 'planted', 'Radish', '2025-04-15', '08:30:00', 'Quick growing spring crop'),
(25, 5, 1, 'watered', 'Lettuce', '2025-04-12', '06:30:00', 'Early morning watering'),
-- March activities
(26, 2, 1, 'harvested', 'Raspberry', '2025-03-10', '07:00:00', 'Early raspberry harvest'),
(27, 2, 1, 'fertilized', 'Rose Bush', '2025-03-10', '18:00:00', 'Spring feeding for roses'),
(28, 1, 1, 'planted', 'Lettuce', '2025-03-08', '07:15:00', 'Cool weather lettuce varieties'),
(29, 3, 1, 'watered', 'Thyme', '2025-03-05', '08:00:00', 'Minimal water for Mediterranean herbs'),
(30, 1, 1, 'harvested', 'Cucumber', '2025-03-05', '19:30:00', 'Perfect cucumbers for salads'),
-- February activities
(31, 3, 1, 'fertilized', 'Parsley', '2025-02-03', '09:00:00', 'Boost for continuous leaf production'),
(32, 1, 1, 'planted', 'Broccoli', '2025-02-01', '06:45:00', 'Early planting for cool weather harvest'),
(33, 4, 1, 'watered', 'Fig Tree', '2025-02-01', '19:45:00', 'Deep watering during dormant season'),
-- January activities
(34, 4, 1, 'harvested', 'Apple Tree', '2025-01-30', '09:00:00', 'Winter apple storage varieties'),
(35, 3, 1, 'planted', 'Cilantro', '2025-01-30', '16:00:00', 'Cool weather cilantro planting'),
(36, 2, 1, 'fertilized', 'Strawberry', '2025-01-28', '08:30:00', 'Winter feeding for next season production'),
(37, 4, 1, 'harvested', 'Pear Tree', '2025-01-25', '10:15:00', 'Late season pear varieties'),
(38, 5, 1, 'watered', 'Spinach', '2025-01-25', '07:00:00', 'Winter spinach growing well'),
(39, 5, 1, 'planted', 'Radish', '2025-01-22', '06:30:00', 'Winter radish succession planting'),
(40, 4, 1, 'harvested', 'Cherry Tree', '2025-01-20', '08:45:00', 'Preserved cherry varieties');

INSERT INTO garden_tasks (id, garden_id, user_id, title, description, plant_name, task_type, status, priority, due_date, estimated_duration, is_recurring, recurring_pattern) VALUES
-- Today's tasks (July 23, 2025)
(1, 1, 1, 'Water tomato plants', 'Morning watering for tomato seedlings', 'Tomato', 'water', 'pending', 'high', '2025-07-23', 15, TRUE, 'daily'),
(2, 1, 1, 'Check pest damage on lettuce', 'Inspect lettuce leaves for pest damage and treat if necessary', 'Lettuce', 'inspect', 'pending', 'high', '2025-07-23', 10, FALSE, NULL),
(3, 3, 1, 'Harvest basil leaves', 'Pick fresh basil leaves for drying', 'Basil', 'harvest', 'pending', 'medium', '2025-07-23', 20, FALSE, NULL),
-- Tomorrow's tasks (July 24, 2025)
(4, 3, 1, 'Water herb garden', 'Gentle watering for delicate herbs', 'Herbs', 'water', 'pending', 'medium', '2025-07-24', 10, TRUE, 'daily'),
(5, 2, 1, 'Fertilize strawberry plants', 'Apply organic fertilizer to strawberry bed', 'Strawberry', 'fertilize', 'pending', 'medium', '2025-07-24', 25, FALSE, NULL),
-- This week's tasks
(6, 1, 1, 'Fertilize carrot bed', 'Apply organic fertilizer to carrot growing area', 'Carrot', 'fertilize', 'pending', 'medium', '2025-07-25', 30, FALSE, NULL),
(7, 1, 1, 'Water pepper plants', 'Deep watering for pepper plants', 'Bell Pepper', 'water', 'pending', 'medium', '2025-07-26', 15, TRUE, 'every-2-days'),
(8, 5, 1, 'Harvest container herbs', 'Pick herbs from balcony containers', 'Mixed Herbs', 'harvest', 'pending', 'low', '2025-07-27', 15, FALSE, NULL),
-- Next week's tasks
(9, 1, 1, 'Plant new lettuce seeds', 'Start new batch of lettuce for continuous harvest', 'Lettuce', 'plant', 'pending', 'low', '2025-07-30', 45, FALSE, NULL),
(10, 1, 1, 'Harvest tomatoes', 'Pick ripe tomatoes for kitchen use', 'Tomato', 'harvest', 'pending', 'medium', '2025-08-05', 25, FALSE, NULL),
(11, 3, 1, 'Prune herb garden', 'Trim overgrown herbs to encourage new growth', 'Various Herbs', 'prune', 'pending', 'low', '2025-08-08', 60, FALSE, NULL),
(12, 1, 1, 'Weed vegetable beds', 'Remove weeds from main vegetable growing areas', 'All Plants', 'weed', 'pending', 'medium', '2025-08-10', 90, TRUE, 'weekly'),
-- Recurring maintenance tasks
(13, 4, 1, 'Deep water fruit trees', 'Weekly deep watering for young orchard', 'Fruit Trees', 'water', 'pending', 'medium', '2025-07-27', 45, TRUE, 'weekly'),
(14, 2, 1, 'Deadhead flowers', 'Remove spent blooms to encourage flowering', 'Flowers', 'maintenance', 'pending', 'low', '2025-07-29', 20, TRUE, 'weekly'),
(15, 5, 1, 'Check container moisture', 'Inspect all containers for proper moisture levels', 'All Container Plants', 'inspect', 'pending', 'medium', '2025-07-24', 10, TRUE, 'daily'),
-- Monthly tasks
(16, 1, 1, 'Soil amendment', 'Add compost to vegetable beds', 'All Vegetables', 'maintenance', 'pending', 'low', '2025-08-01', 120, TRUE, 'monthly'),
(17, 2, 1, 'Rose care', 'Prune, fertilize and check for disease', 'Rose Bush', 'maintenance', 'pending', 'medium', '2025-08-15', 60, TRUE, 'monthly'),
(18, 4, 1, 'Fruit tree inspection', 'Check for pests, disease, and pruning needs', 'All Fruit Trees', 'inspect', 'pending', 'high', '2025-08-01', 90, TRUE, 'monthly'),
-- Seasonal tasks
(19, 3, 1, 'Herb seed collection', 'Collect seeds from mature herb plants', 'Various Herbs', 'harvest', 'pending', 'low', '2025-09-15', 45, FALSE, NULL),
(20, 1, 1, 'Fall planting prep', 'Prepare beds for cool-season crops', 'Fall Vegetables', 'plant', 'pending', 'medium', '2025-08-20', 120, FALSE, NULL),
-- Completed tasks (examples)
(21, 1, 1, 'Water morning vegetables', 'Completed morning watering routine', 'Vegetables', 'water', 'completed', 'high', '2025-07-22', 20, TRUE, 'daily'),
(22, 3, 1, 'Harvest fresh herbs', 'Picked herbs for dinner', 'Basil, Parsley', 'harvest', 'completed', 'medium', '2025-07-22', 15, FALSE, NULL),
(23, 2, 1, 'Berry bush maintenance', 'Pruned and weeded around berry bushes', 'Berries', 'maintenance', 'completed', 'low', '2025-07-21', 75, FALSE, NULL);

