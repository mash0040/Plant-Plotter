'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Calendar, MapPin, Ruler, Leaf, Eye, BarChart3, Settings, ChevronDown, Heart, AlertTriangle } from 'lucide-react';
import apiClient from '@/lib/api';
import GardenForm from '@/components/Gardens/GardenForm'; 
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmationModal from '@/components/ConfirmationModal';

function GardenDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const [garden, setGarden] = useState(null);
  const [plantLibrary, setPlantLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false); 
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Single useEffect to load both garden and plant library data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load garden data
        const gardenData = await apiClient.getGarden(params.id);
        
        // Load plant library from backend
        const plantLibraryData = await apiClient.getPlantLibrary();
        
        setGarden(gardenData);
        setPlantLibrary(plantLibraryData);
        
      } catch (error) {
        console.error('Failed to load data:', error);
        if (error.status === 401) {
          return;
        }
        
        // Try localStorage fallback for garden
        try {
          const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
          const localGarden = localGardens.find(g => g.id == params.id);
          if (localGarden) {
            setGarden(localGarden);
          }
        } catch (localError) {
          console.error('Failed to load from localStorage:', localError);
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadData();
    }
  }, [params.id]);

  // Close mobile garden actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen) {
        const menu = event.target.closest('[data-garden-actions-menu]');
        const button = event.target.closest('[data-garden-actions-button]');
        
        if (!menu && !button) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = setTimeout(() => {
      setSuccessMessage('');
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [successMessage]);

  const handleOpenGardenPlanner = () => {
    router.push(`/garden?id=${garden.id}`);
  };

  const handleMobileEditGarden = () => {
    handleEditBasicInfo();
    setMobileMenuOpen(false);
  };

  const handleMobileOpenGardenPlanner = () => {
    setMobileMenuOpen(false);
    handleOpenGardenPlanner();
  };

  const handleEditBasicInfo = (e) => {
    e?.stopPropagation();
    setSuccessMessage('');
    setShowEditForm(true);
  };

  const handleSaveGarden = async (updatedGardenData) => {
    try {
      const updatedGarden = await apiClient.updateGarden(garden.id, {
        ...updatedGardenData,
        plantedItems: garden.plantedItems || [],
        plantCount: garden.plantCount || 0
      });
      
      setGarden(updatedGarden);
      
      // Also update localStorage as fallback
      const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
      const gardenIndex = localGardens.findIndex(g => g.id == garden.id);
      
      if (gardenIndex !== -1) {
        localGardens[gardenIndex] = updatedGarden;
        localStorage.setItem('gardens', JSON.stringify(localGardens));
      }
      setSuccessMessage('Garden updated successfully.');
    } catch (error) {
      console.error('Failed to update garden:', error);
      if (error.status === 401 || error.status === 400 || error.errors) {
        throw error;
      }

      // Fallback to localStorage only
      const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
      const gardenIndex = localGardens.findIndex(g => g.id == garden.id);
      
      if (gardenIndex !== -1) {
        const updatedGarden = {
          ...localGardens[gardenIndex],
          ...updatedGardenData,
          id: garden.id,
          updatedAt: new Date().toISOString(),
          plantedItems: garden.plantedItems || [],
          plantCount: garden.plantCount || 0
        };
        
        localGardens[gardenIndex] = updatedGarden;
        localStorage.setItem('gardens', JSON.stringify(localGardens));
        setGarden(updatedGarden);
        setSuccessMessage('Garden updated successfully.');
      }
    }
    
    setShowEditForm(false);
  };

  const handleCloseForm = () => {
    setShowEditForm(false);
  };

  const handleConfirmDeleteGarden = async () => {
    setShowDeleteConfirm(false);

    try {
      await apiClient.deleteGarden(garden.id);
      router.push('/gardens');
    } catch (error) {
      console.error('Failed to delete garden via API:', error);
      if (error.status === 401) {
        return;
      }

      const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
      const updatedGardens = localGardens.filter(g => g.id != garden.id);
      localStorage.setItem('gardens', JSON.stringify(updatedGardens));
      router.push('/gardens');
    }
  };

  const normalizePlantName = (name) => String(name || '').toLowerCase().trim();

  const findLibraryPlantForPlantedItem = (plantedItem) => {
    if (!plantedItem || !plantLibrary.length) return null;

    const plantedItemId = plantedItem.plantId || plantedItem.plant_id || plantedItem.id;
    const plantedItemName = normalizePlantName(plantedItem.name || plantedItem.plant_name);

    return plantLibrary.find((plant) => (
      plant.id === plantedItemId ||
      normalizePlantName(plant.name) === plantedItemName
    )) || null;
  };

  const getPlantCategory = (plantedItem) => {
    const itemCategory = plantedItem?.category || plantedItem?.plant_category || plantedItem?.type;
    if (itemCategory && itemCategory.toLowerCase?.() !== 'other') {
      return itemCategory;
    }

    const libraryPlant = findLibraryPlantForPlantedItem(plantedItem);
    return libraryPlant?.category || libraryPlant?.type || 'Other';
  };

  const parsePlantList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
      const parsedValue = JSON.parse(value);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch (error) {
      return [];
    }
  };

  // Clean companion plant suggestions with name-based mapping
  const getCompanionSuggestions = () => {
    if (!garden?.plantedItems || garden.plantedItems.length === 0) {
      return { groups: [] };
    }

    if (!plantLibrary.length) {
      return {
        groups: garden.plantedItems.map(plantedItem => ({
          plantedItem,
          companions: [],
          avoid: [],
          hasData: false
        }))
      };
    }

    // Map plant names to plant library IDs
    const mapPlantNameToId = (plantName) => {
      const nameToIdMap = {
        // VEGETABLES
        'alliums': 'alliums', 'allium': 'alliums', 'onion family': 'alliums',
        'asparagus': 'asparagus',
        'bush beans': 'beans_bush', 'beans bush': 'beans_bush',
        'pole beans': 'beans_pole', 'beans pole': 'beans_pole', 'climbing beans': 'beans_pole',
        'fava beans': 'beans_fava', 'beans fava': 'beans_fava', 'broad beans': 'beans_fava',
        'beets': 'beets', 'beet': 'beets', 'beetroot': 'beets',
        'brassicas': 'brassicas', 'brassica': 'brassicas', 'cabbage family': 'brassicas',
        'broccoli': 'broccoli',
        'brussels sprouts': 'brussels_sprouts', 'brussels sprout': 'brussels_sprouts',
        'cabbage': 'cabbage',
        'carrot': 'carrot', 'carrots': 'carrot',
        'cauliflower': 'cauliflower',
        'celery': 'celery',
        'chard': 'chard', 'swiss chard': 'chard',
        'corn': 'corn', 'maize': 'corn', 'sweet corn': 'corn',
        'cucumber': 'cucumber', 'cucumbers': 'cucumber',
        'cucurbits': 'cucurbits', 'squash family': 'cucurbits',
        'eggplant': 'eggplant', 'aubergine': 'eggplant',
        'kohlrabi': 'kohlrabi',
        'leek': 'leek', 'leeks': 'leek',
        'legumes': 'legumes', 'legume': 'legumes', 'beans and peas': 'legumes',
        'lettuce': 'lettuce', 'leafy greens': 'lettuce',
        'mustard': 'mustard', 'mustard greens': 'mustard',
        'nightshades': 'nightshades', 'nightshade': 'nightshades', 'tomato family': 'nightshades',
        'okra': 'okra',
        'onion': 'onion', 'onions': 'onion',
        'parsnip': 'parsnip', 'parsnips': 'parsnip',
        'peas': 'peas', 'pea': 'peas', 'garden peas': 'peas',
        'pepper': 'pepper', 'bell pepper': 'pepper', 'sweet pepper': 'pepper', 'peppers': 'pepper', 'bell peppers': 'pepper',
        'potato': 'potato', 'potatoes': 'potato',
        'pumpkin': 'pumpkin', 'pumpkins': 'pumpkin',
        'radish': 'radish', 'radishes': 'radish',
        'soybean': 'soybean', 'soybeans': 'soybean', 'soy': 'soybean',
        'spinach': 'spinach',
        'squash': 'squash', 'summer squash': 'squash', 'zucchini': 'squash', 'courgette': 'squash',
        'sweet potato': 'sweet_potato', 'sweet potatoes': 'sweet_potato',
        'tomato': 'tomato', 'tomatoes': 'tomato',
        'turnip': 'turnip', 'turnips': 'turnip',

        // FRUITS
        'apple': 'apple', 'apples': 'apple', 'apple tree': 'apple', 'apple trees': 'apple',
        'apricot': 'apricot', 'apricots': 'apricot', 'apricot tree': 'apricot',
        'blueberry': 'blueberry', 'blueberries': 'blueberry', 'blueberry bush': 'blueberry',
        'fruit trees': 'fruit_trees', 'fruit tree': 'fruit_trees',
        'grape': 'grape', 'grapes': 'grape', 'grapevine': 'grape', 'grape vine': 'grape',
        'melon': 'melon', 'melons': 'melon', 'cantaloupe': 'melon', 'honeydew': 'melon',
        'passion fruit': 'passion_fruit', 'passionfruit': 'passion_fruit',
        'pear': 'pear', 'pears': 'pear', 'pear tree': 'pear',
        'strawberry': 'strawberry', 'strawberries': 'strawberry', 'strawberry plant': 'strawberry',
        'raspberry': 'raspberry', 'raspberries': 'raspberry', 'raspberry canes': 'raspberry',
        'cherry': 'cherry', 'cherries': 'cherry', 'cherry tree': 'cherry',
        'peach': 'peach', 'peaches': 'peach', 'peach tree': 'peach',
        'fig': 'fig', 'figs': 'fig', 'fig tree': 'fig',

        // HERBS
        'anise': 'anise',
        'basil': 'basil', 'sweet basil': 'basil', 'thai basil': 'basil',
        'borage': 'borage',
        'caraway': 'caraway',
        'catnip': 'catnip', 'cat mint': 'catnip',
        'chamomile': 'chamomile', 'german chamomile': 'chamomile',
        'chervil': 'chervil',
        'chives': 'chives',
        'cilantro': 'cilantro', 'coriander': 'cilantro', 'fresh coriander': 'cilantro',
        'dill': 'dill', 'dill weed': 'dill',
        'fennel': 'fennel', 'florence fennel': 'fennel',
        'flax': 'flax', 'linseed': 'flax',
        'garlic': 'garlic',
        'hyssop': 'hyssop',
        'lavender': 'lavender', 'english lavender': 'lavender', 'french lavender': 'lavender',
        'lemongrass': 'lemongrass', 'lemon grass': 'lemongrass',
        'lovage': 'lovage',
        'oregano': 'oregano', 'wild marjoram': 'oregano',
        'parsley': 'parsley', 'flat leaf parsley': 'parsley', 'curly parsley': 'parsley', 'italian parsley': 'parsley',
        'peppermint': 'peppermint',
        'mint': 'peppermint', // default to peppermint unless specified
        'rosemary': 'rosemary',
        'sage': 'sage', 'common sage': 'sage',
        'southernwood': 'southernwood',
        'spearmint': 'spearmint', 'garden mint': 'spearmint',
        'stinging nettle': 'stinging_nettle', 'nettle': 'stinging_nettle',
        'summer savory': 'summer_savory', 'savory': 'summer_savory',
        'tarragon': 'tarragon', 'french tarragon': 'tarragon',
        'thyme': 'thyme', 'common thyme': 'thyme', 'garden thyme': 'thyme',
        'wormwood': 'wormwood',
        'yarrow': 'yarrow', 'achillea': 'yarrow',

        // FLOWERS
        'alyssum': 'alyssum', 'sweet alyssum': 'alyssum',
        'baby breath': 'baby_breath', "baby's breath": 'baby_breath',
        'bee balm': 'bee_balm', 'monarda': 'bee_balm',
        'california poppy': 'california_poppy',
        'dianthus': 'dianthus', 'carnation': 'dianthus', 'pinks': 'dianthus',
        'geranium': 'geranium', 'pelargonium': 'geranium',
        'larkspur': 'larkspur',
        'lupin': 'lupin', 'lupine': 'lupin',
        'marigold': 'marigold', 'french marigold': 'marigold', 'african marigold': 'marigold',
        'nasturtium': 'nasturtium', 'indian cress': 'nasturtium',
        'pansy': 'pansy', 'viola': 'pansy',
        'petunia': 'petunia',
        'phacelia': 'phacelia', 'bee bread': 'phacelia',
        'rose': 'rose', 'roses': 'rose', 'rose bush': 'rose',
        'sunflower': 'sunflower', 'sunflowers': 'sunflower',
        'swan plant': 'swan_plant', 'milkweed': 'swan_plant',
        'sweet pea': 'sweet_pea', 'sweet peas': 'sweet_pea',
        'tansy': 'tansy',
        'zinnia': 'zinnia', 'zinnias': 'zinnia',

        // OTHER
        'alfalfa': 'alfalfa', 'lucerne': 'alfalfa',
        'peanut': 'peanut', 'peanuts': 'peanut', 'groundnut': 'peanut',
        'walnut tree': 'walnut_tree', 'walnut': 'walnut_tree', 'black walnut': 'walnut_tree'
      };
      
      return nameToIdMap[plantName.toLowerCase().trim()] || null;
    };

    const plantedPlantIds = garden.plantedItems
      .map(item => item.plantId || item.plant_id || mapPlantNameToId(item.name))
      .filter(Boolean);

    const groups = garden.plantedItems.map((plantedItem) => {
      const plantId = plantedItem.plantId || plantedItem.plant_id || mapPlantNameToId(plantedItem.name);
      const plantData = findLibraryPlantForPlantedItem(plantedItem) || plantLibrary.find(p => p.id === plantId);

      if (!plantData) {
        return {
          plantedItem,
          companions: [],
          avoid: [],
          hasData: false
        };
      }

      const companionPlants = parsePlantList(plantData.companion_plants || plantData.companionPlants);
      const avoidPlants = parsePlantList(plantData.avoid_plants || plantData.avoidPlants);

      return {
        plantedItem,
        hasData: companionPlants.length > 0 || avoidPlants.length > 0,
        companions: companionPlants
          .filter(id => !plantedPlantIds.includes(id))
          .map(id => plantLibrary.find(p => p.id === id))
          .filter(Boolean),
        avoid: avoidPlants
          .filter(id => !plantedPlantIds.includes(id))
          .map(id => plantLibrary.find(p => p.id === id))
          .filter(Boolean)
      };
    });

    return { groups };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading garden...</p>
        </div>
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Garden Not Found</h1>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">The garden you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/gardens')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 text-sm sm:text-base"
          >
            Back to Gardens
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Dormant': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'plants', label: 'Plants', icon: Leaf },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'companion', label: 'Companion', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const companionData = getCompanionSuggestions();

  return (
    <div className="min-h-screen overflow-auto shadow-lg bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* Garden Form Popup */}
      <GardenForm
        garden={garden}
        onSave={handleSaveGarden}
        onClose={handleCloseForm}
        isOpen={showEditForm}
      />

      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-green-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/gardens')}
                className="p-2 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{garden.name}</h1>
                <div className="flex items-center gap-2 sm:gap-4 mt-1">
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{garden.location}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(garden.status)}`}>
                    {garden.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex gap-2">
              <button
                onClick={handleEditBasicInfo}
                className="px-3 sm:px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden md:inline">Edit Info</span>
              </button>
              <button
                onClick={handleOpenGardenPlanner}
                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Garden Planner</span>
              </button>
            </div>

            {/* Mobile Garden Actions */}
            <div className="relative sm:hidden flex-shrink-0">
              <button
                data-garden-actions-button
                type="button"
                onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
                aria-expanded={mobileMenuOpen}
                aria-haspopup="menu"
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                Actions
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {mobileMenuOpen && (
                <div
                  data-garden-actions-menu
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-green-100 bg-white shadow-lg z-40 overflow-hidden"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleMobileEditGarden}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
                  >
                    <Edit className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-blue-800">Edit Garden Info</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleMobileOpenGardenPlanner}
                    className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
                  >
                    <Settings className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-green-800">Open Garden Planner</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
            {successMessage}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Garden Size</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">
                  {garden.dimensions?.width || garden.width}×{garden.dimensions?.height || garden.height}m
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <Ruler className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Total Plants</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{garden.plantCount || garden.plantedItems?.length || 0}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <Leaf className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Soil Type</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{garden.soil_type}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <span className="text-lg sm:text-xl">🌱</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Created</p>
                <p className="text-sm sm:text-lg font-bold text-gray-800">
                  {garden.created_at ? new Date(garden.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex min-w-max sm:min-w-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600 bg-green-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Garden Overview</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="text-gray-800 truncate ml-2">{garden.location}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="text-gray-800">{garden.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Soil Type:</span>
                            <span className="text-gray-800">{garden.soil_type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">Dimensions</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Width:</span>
                            <span className="text-gray-800">{garden.dimensions?.width || garden.width}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Height:</span>
                            <span className="text-gray-800">{garden.dimensions?.height || garden.height}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Garden Area:</span>
                            <span className="text-gray-800">
                              {((garden.dimensions?.width || garden.width) * (garden.dimensions?.height || garden.height)).toFixed(1)} sq m
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-2">Garden Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">Created:</span>
                            <span className="text-gray-800">
                              {garden.created_at ? new Date(garden.created_at).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">Last Updated:</span>
                            <span className="text-gray-800">
                              {garden.updated_at ? new Date(garden.updated_at).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">Plant Count:</span>
                            <span className="text-gray-800">
                              {garden.plantedItems?.length || 0} {(garden.plantedItems?.length || 0) === 1 ? 'plant' : 'plants'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">Total Garden Area:</span>
                            <span className="text-gray-800">
                              {((garden.dimensions?.width || garden.width) * (garden.dimensions?.height || garden.height)).toFixed(1)} sq m
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {garden.plantedItems && garden.plantedItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-4">Recent Plants Added</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {garden.plantedItems.slice(0, 6).map((plant, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                          <span className="text-2xl flex-shrink-0">{plant.emoji || '🌱'}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{plant.name}</p>
                            <p className="text-sm text-gray-600">
                              Planted {plant.plantedDate ? new Date(plant.plantedDate).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'plants' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Plants in Garden</h3>
                  <button
                    onClick={handleOpenGardenPlanner}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Leaf className="w-4 h-4" />
                    Manage Plants
                  </button>
                </div>
                
                {garden.plantedItems && garden.plantedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {garden.plantedItems.map((plant, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl flex-shrink-0">{plant.emoji || '🌱'}</span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-800 truncate">{plant.name}</h4>
                            <p className="text-sm text-gray-600">Size: {plant.size}x{plant.size}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Position: ({plant.xPosition || 'N/A'}, {plant.yPosition || 'N/A'})</p>
                          <p>Planted: {plant.plantedDate ? new Date(plant.plantedDate).toLocaleDateString() : 'Unknown'}</p>
                          {plant.notes && <p className="truncate">Notes: {plant.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Leaf className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">No plants yet</h4>
                    <p className="text-gray-600 mb-6">Start designing your garden by adding some plants.</p>
                    <button
                      onClick={handleOpenGardenPlanner}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Open Garden Planner
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Garden Analytics</h3>
                
                {garden.plantedItems && garden.plantedItems.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Plant Categories */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Plant Categories</h4>
                      <div className="space-y-3">
                        {(() => {
                          const categories = garden.plantedItems.reduce((acc, plant) => {
                            const category = getPlantCategory(plant);
                            acc[category] = (acc[category] || 0) + 1;
                            return acc;
                          }, {});
                          
                          return Object.entries(categories).map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between">
                              <span className="text-gray-600 capitalize text-sm">{category}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ width: `${(count / garden.plantedItems.length) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-800 w-6 text-right">{count}</span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Space Utilization */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Space Utilization</h4>
                      <div className="space-y-3">
                        {(() => {
                          const totalArea = (garden.dimensions?.width || garden.width) * (garden.dimensions?.height || garden.height) || 1;
                          const usedSpace = garden.plantedItems.reduce((sum, plant) => sum + ((plant.size || 1) * (plant.size || 1)), 0);
                          const utilizationPercent = Math.min((usedSpace / totalArea) * 100, 100);
                          
                          return (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 text-sm">Garden Space Used</span>
                                <span className="text-sm font-medium text-gray-800">
                                  {utilizationPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                                  style={{ width: `${utilizationPercent}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {usedSpace.toFixed(1)} sq m used of {totalArea.toFixed(1)} sq m total
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>


                    {/* Growth Timeline */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Planting Timeline</h4>
                      <div className="space-y-3">
                        {garden.plantedItems
                          .sort((a, b) => new Date(b.plantedDate) - new Date(a.plantedDate))
                          .slice(0, 5)
                          .map((plant, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            <span className="text-lg">{plant.emoji || '🌱'}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{plant.name}</p>
                              <p className="text-xs text-gray-600">
                                {plant.plantedDate ? new Date(plant.plantedDate).toLocaleDateString() : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">No analytics available</h4>
                    <p className="text-gray-600">Add some plants to see garden analytics and insights.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'companion' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Companion Planting Guide</h3>
                    <p className="text-sm text-gray-600 mt-1">Plants that work well with your current garden</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Suggestions are based on the app's companion planting dataset.
                    </p>
                  </div>
                </div>
                
                {garden.plantedItems && garden.plantedItems.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {companionData.groups.map(({ plantedItem, companions, avoid, hasData }) => (
                      <div key={plantedItem.id || plantedItem.name} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-2xl">{plantedItem.emoji || 'Plant'}</span>
                          <div>
                            <h4 className="font-semibold text-gray-800">{plantedItem.name}</h4>
                            <p className="text-xs text-gray-500 capitalize">{getPlantCategory(plantedItem)}</p>
                          </div>
                        </div>

                        {!hasData ? (
                          <p className="text-sm text-gray-600">No companion planting data is available for this plant yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Heart className="w-4 h-4 text-green-500" />
                                <h5 className="text-sm font-semibold text-gray-800">Good companions</h5>
                              </div>
                              {companions.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {companions.map((plant) => (
                                    <div key={plant.id} className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                                      <span className="text-xl">{plant.emoji}</span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{plant.name}</p>
                                        <p className="text-xs text-gray-600 capitalize">{plant.category || plant.type}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No additional companion suggestions for this plant.</p>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                <h5 className="text-sm font-semibold text-gray-800">Plants to avoid</h5>
                              </div>
                              {avoid.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {avoid.map((plant) => (
                                    <div key={plant.id} className="bg-orange-50 rounded-lg p-3 flex items-center gap-2">
                                      <span className="text-xl">{plant.emoji}</span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{plant.name}</p>
                                        <p className="text-xs text-gray-600 capitalize">{plant.category || plant.type}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No incompatible plants listed for this plant.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">No plants to analyze</h4>
                    <p className="text-gray-600 mb-6">Add some plants to your garden to see companion planting suggestions.</p>
                    <button
                      onClick={handleOpenGardenPlanner}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Start Planting
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Garden Settings</h3>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
                  <h4 className="font-semibold text-red-800 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-600 mb-4">
                    Once you delete a garden, there is no going back. Please be certain.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Delete Garden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete garden?"
        message={`Delete "${garden.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteGarden}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default function GardenDetailPage() {
  return (
    <ProtectedRoute>
      <GardenDetailPageContent />
    </ProtectedRoute>
  );
}
