const DEFAULT_MODULE = {
  name: "lesen",
  dataFile: "lesen.json",
  timer: {
    enabled: true,
    durationMinutes: 90
  },
  scoreConfig: {
    passPercent: 60,
    parts: {
      "teil-1": { pointsPerQuestion: 5 },
      "teil-2": { pointsPerQuestion: 5 },
      "teil-3": { pointsPerQuestion: 2.5 },
      "sprachbausteine-1": { pointsPerQuestion: 1.5 },
      "sprachbausteine-2": { pointsPerQuestion: 1.5 }
    }
  }
};

const DEFAULT_CONFIG = {
  fontScale: 1,
  asideWidth: "40%",
  modules: [DEFAULT_MODULE],
  defaultModule: DEFAULT_MODULE.name,
  timer: DEFAULT_MODULE.timer,
  scoreConfig: DEFAULT_MODULE.scoreConfig,
  dataFile: DEFAULT_MODULE.dataFile
};

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (text !== undefined) {
    el.textContent = text;
  }
  return el;
}

function normalize(value) {
  return (value || "").toLowerCase().trim();
}

function buildModuleConfig(entry) {
  const target = entry || {};
  return {
    name: target.name || DEFAULT_MODULE.name,
    dataFile: target.dataFile || DEFAULT_MODULE.dataFile,
    timer: {
      ...DEFAULT_MODULE.timer,
      ...(target.timer || {})
    },
    scoreConfig: {
      passPercent: target.scoreConfig?.passPercent ?? DEFAULT_MODULE.scoreConfig.passPercent,
      parts: {
        ...DEFAULT_MODULE.scoreConfig.parts,
        ...(target.scoreConfig?.parts || {})
      }
    }
  };
}

function normalizeConfig(config) {
  const merged = { ...DEFAULT_CONFIG, ...(config || {}) };
  const entries = Array.isArray(config?.modules) && config.modules.length
    ? config.modules
    : [{ name: config?.name || merged.defaultModule, dataFile: config?.dataFile, timer: config?.timer, scoreConfig: config?.scoreConfig }];
  const modules = entries.map((entry) => buildModuleConfig(entry));
  const defaultModuleName = config?.defaultModule || modules[0].name;
  const activeModule = modules.find((module) => module.name === defaultModuleName) || modules[0];
  return {
    ...merged,
    modules,
    defaultModule: defaultModuleName,
    dataFile: activeModule.dataFile,
    timer: activeModule.timer,
    scoreConfig: activeModule.scoreConfig,
    activeModuleName: activeModule.name
  };
}

async function loadConfig() {
  const paths = ["database/config.json", "../database/config.json"];
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const config = await response.json();
        return normalizeConfig(config);
      }
    } catch (error) {
      // ignore and try next
    }
  }
  return normalizeConfig();
}

async function loadDatabase(config) {
  const resolvedConfig = config || DEFAULT_CONFIG;
  const dataFile = resolvedConfig.dataFile || DEFAULT_CONFIG.dataFile;
  const paths = [`database/${dataFile}`, `../database/${dataFile}`];
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // ignore and try next
    }
  }
  return null;
}

function getVersionKeys(themeEntry) {
  if (!themeEntry) {
    return [];
  }
  if (themeEntry.versionOrder?.length) {
    return themeEntry.versionOrder;
  }
  return Object.keys(themeEntry.versions || {});
}
