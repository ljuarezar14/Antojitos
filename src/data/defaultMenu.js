export const DEFAULT_CATEGORIES = [
  { id: 'todos', name: 'Todo el Menú', icon: 'Utensils' },
  { id: 'comidas', name: 'Comidas 🍔', icon: 'Utensils' },
  { id: 'frituras', name: 'Frituras 🍟', icon: 'Flame' },
  { id: 'bebidas', name: 'Bebidas 🍷', icon: 'GlassWater' },
  { id: 'extras', name: 'Extras 🍳', icon: 'PlusCircle' },
];

export const DEFAULT_CREMAS = [
  { id: 'mayo', name: 'Mayonesa', short: 'Mayo' },
  { id: 'aji', name: 'Ají Pollero', short: 'Ají' },
  { id: 'tartara', name: 'Tártara', short: 'Tártara' },
  { id: 'ketchup', name: 'Kétchup', short: 'Kétchup' },
  { id: 'mostaza', name: 'Mostaza', short: 'Mostaza' },
  { id: 'golf', name: 'Salsa Golf', short: 'Golf' },
  { id: 'aceituna', name: 'Crema de Aceituna', short: 'Aceituna' },
];

export const DEFAULT_MENU = [
  // COMIDAS (Directamente de su afiche)
  {
    id: 'prod-hamburguesa',
    name: 'Hamburguesa',
    category: 'comidas',
    price: 6.00,
    description: 'Carne jugosa a la plancha, lechuga fresca, tomate y queso',
    available: true,
    popular: true,
    emoji: '🍔'
  },
  {
    id: 'prod-aguadito',
    name: 'Aguadito Criollo',
    category: 'comidas',
    price: 3.00,
    description: 'Calientito con menudencia de pollo, culantro, arroz y arvejas',
    available: true,
    popular: true,
    emoji: '🍲'
  },
  {
    id: 'prod-alitas',
    name: 'Alitas Acevichadas',
    category: 'comidas',
    price: 10.00,
    description: 'Alitas crocantes bañadas en exquisita salsa acevichada de la casa',
    available: true,
    popular: true,
    emoji: '🍗'
  },

  // FRITURAS (Directamente de su afiche)
  {
    id: 'prod-salchipollo',
    name: 'Salchipollo',
    category: 'frituras',
    price: 6.00,
    description: 'Papas fritas crocantes + trozos de pollo dorado + hot dog parrillero',
    available: true,
    popular: true,
    emoji: '🥓'
  },
  {
    id: 'prod-salchipapa',
    name: 'Salchipapa Clásica',
    category: 'frituras',
    price: 5.00,
    description: 'Porción de papas fritas con abundantes rodajas de hot dog',
    available: true,
    popular: true,
    emoji: '🍟'
  },
  {
    id: 'prod-patitas',
    name: 'Patitas de Pollo',
    category: 'frituras',
    price: 4.00,
    description: 'Patitas de pollo crocantes doraditas con papas y cremas',
    available: true,
    popular: true,
    emoji: '🍗'
  },
  {
    id: 'prod-broaster-pierna',
    name: 'Pollo Broaster (Pierna)',
    category: 'frituras',
    price: 10.00,
    description: 'Pierna crocante y jugosa con papas fritas y ensalada',
    available: true,
    popular: true,
    emoji: '🍗'
  },
  {
    id: 'prod-broaster-pecho',
    name: 'Pollo Broaster (Pecho)',
    category: 'frituras',
    price: 12.00,
    description: 'Pecho grande crocante con papas fritas generosas',
    available: true,
    popular: false,
    emoji: '🍗'
  },

  // BEBIDAS (Directamente de su afiche)
  {
    id: 'prod-chicha',
    name: 'Vaso de Chicha Morada',
    category: 'bebidas',
    price: 1.00,
    description: 'Chicha natural bien helada de maíz morado con limón y canela',
    available: true,
    popular: true,
    emoji: '🍷'
  },
  {
    id: 'prod-gaseosa',
    name: 'Inca Kola 500ml',
    category: 'bebidas',
    price: 3.50,
    description: 'Heladita o sin helar',
    available: true,
    popular: true,
    emoji: '🥤'
  },

  // EXTRAS
  {
    id: 'prod-huevo',
    name: 'Huevo Frito Montado',
    category: 'extras',
    price: 1.50,
    description: 'Huevo calientito a la plancha para tu salchipapa o hamburguesa',
    available: true,
    popular: false,
    emoji: '🍳'
  },
  {
    id: 'prod-papas-extra',
    name: 'Porción Extra de Papas',
    category: 'extras',
    price: 3.00,
    description: 'Papas fritas adicionales bien servidas',
    available: true,
    popular: false,
    emoji: '🍟'
  }
];
