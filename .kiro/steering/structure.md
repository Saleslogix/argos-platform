# Project Structure

## Monorepo Organization

```
monorepo-root/
├── argos-sdk/              # Core SDK framework
├── products/
│   └── argos-saleslogix/   # SalesLogix CRM product
├── packages/
│   ├── graphs/             # Graph utilities
│   └── grunt-argos-deps/   # Grunt dependency plugin
└── tests/                  # Shared test utilities
```

## argos-sdk Structure

```
argos-sdk/
├── src/                    # ES6+ source code
│   ├── Application.js      # Main application class
│   ├── View.js             # Base view class
│   ├── List.js             # List view base
│   ├── Detail.js           # Detail view base
│   ├── Edit.js             # Edit view base
│   ├── Fields/             # Form field components
│   ├── Models/             # Data models and adapters
│   ├── Store/              # Data stores (SData, PouchDB)
│   ├── Offline/            # Offline sync mixins
│   ├── Dialogs/            # Modal, Toast, BusyIndicator
│   ├── Views/              # Reusable view components
│   ├── Groups/             # List grouping logic
│   ├── actions/            # Redux actions
│   └── reducers/           # Redux reducers
├── src-out/                # Transpiled AMD modules (build output)
├── tests/                  # Jasmine unit tests
├── libraries/              # Third-party libraries
│   ├── dojo/               # Dojo toolkit
│   ├── pouchdb/            # PouchDB
│   ├── moment/             # Moment.js
│   └── soho/               # Soho/IDS components
├── localization/           # L20n localization files
├── content/css/            # LESS stylesheets
├── min/                    # Minified CSS output
└── grunt-tasks/            # Grunt task configurations
```

## argos-saleslogix Structure

```
products/argos-saleslogix/
├── src/                    # ES6+ source code
│   ├── Application.js      # SalesLogix app (extends SDK)
│   ├── ApplicationModule.js # Module registration
│   ├── Views/              # CRM-specific views
│   │   ├── Account/        # Account entity views
│   │   ├── Contact/        # Contact entity views
│   │   ├── Opportunity/    # Opportunity entity views
│   │   ├── Activity/       # Activity views
│   │   └── ...             # Other entity views
│   ├── Models/             # CRM data models
│   ├── Fields/             # Custom field types
│   ├── Integrations/       # Third-party integrations
│   ├── actions/            # Redux actions
│   └── reducers/           # Redux reducers
├── src-out/                # Transpiled AMD modules
├── tests/                  # Unit and E2E tests
│   ├── src/                # Mocha unit tests
│   └── e2e/                # Playwright E2E tests
├── localization/           # Localized strings (multiple languages)
├── configuration/          # Environment configs
│   ├── development.js      # Dev configuration
│   └── production.js       # Production configuration
├── content/                # Static assets
├── scripts/                # Dev server
└── grunt-tasks/            # Grunt task configurations
```

## Key Architectural Patterns

### View Hierarchy
- **Base Views**: `View`, `_ListBase`, `_DetailBase`, `_EditBase`
- **Mixins**: `_SDataListMixin`, `_SDataDetailMixin`, `_SDataEditMixin` for SData integration
- **Offline Mixins**: `_ListOfflineMixin`, `_DetailOfflineMixin` for offline support
- **Customization**: `_CustomizationMixin` for view customization

### Module System
- **ApplicationModule**: Base class for registering views, models, and customizations
- Modules are loaded and initialized by the Application class
- Each module can register views, toolbars, and customizations

### Data Layer
- **Models**: `_ModelBase`, `_SDataModelBase`, `_OfflineModelBase`
- **Stores**: `Store/SData`, `Store/PouchDB`
- **Adapters**: `Models/Adapter` for model-store integration
- **Manager**: `Models/Manager` for model registry

### State Management
- Redux store at `App.store`
- Actions in `src/actions/`
- Reducers in `src/reducers/`
- Connection state, user state, config state

## File Naming Conventions

- **Views**: PascalCase (e.g., `AccountDetail.js`, `ContactList.js`)
- **Mixins**: Underscore prefix (e.g., `_SDataListMixin.js`, `_ActionMixin.js`)
- **Base Classes**: Underscore prefix (e.g., `_ListBase.js`, `_DetailBase.js`)
- **Tests**: Same name with `Tests` suffix (e.g., `UtilityTests.js`)
- **Localization**: Language code (e.g., `en.js`, `de.js`, `fr.js`)

## Build Output

- **src-out/**: Transpiled AMD modules (ES6+ → ES5 AMD)
- **min/css/**: Compiled and minified CSS from LESS
- **build/**: Grunt build artifacts
- **deploy/**: Deployment bundles (SalesLogix only)

## Dependencies Between Packages

- `argos-saleslogix` depends on `argos-sdk` (workspace symlink)
- Changes to SDK are immediately available to SalesLogix
- Both packages share root-level dev dependencies (grunt, babel, eslint)
