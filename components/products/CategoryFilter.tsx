interface CategoryFilterProps {
  categories: string[]
  selected: string
  onSelect: (category: string) => void
}

export default function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect('')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selected === ''
            ? 'bg-primary-600 text-white'
            : 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200'
        }`}
      >
        All Categories
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selected === category
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
