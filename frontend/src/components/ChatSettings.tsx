import React from 'react';
import { 
  MODELS, 
  ModelOption, 
  DEFAULT_TEMPERATURE, 
  MIN_TEMPERATURE, 
  MAX_TEMPERATURE, 
  TEMPERATURE_STEP 
} from '../config';

interface ChatSettingsProps {
  selectedModel: string;
  temperature: number;
  onModelChange: (modelId: string) => void;
  onTemperatureChange: (temperature: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({
  selectedModel,
  temperature,
  onModelChange,
  onTemperatureChange,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onTemperatureChange(DEFAULT_TEMPERATURE);
  };

  // Group models by provider
  const modelsByProvider: Record<string, ModelOption[]> = {};
  MODELS.forEach(model => {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    modelsByProvider[model.provider].push(model);
  });

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Chat Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>Model</h3>
            <select 
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="model-select"
            >
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <optgroup key={provider} label={provider}>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            
            {/* Show selected model description */}
            {MODELS.find(model => model.id === selectedModel)?.description && (
              <div className="model-description">
                {MODELS.find(model => model.id === selectedModel)?.description}
              </div>
            )}
          </div>
          
          <div className="settings-section">
            <div className="temperature-header">
              <h3>Temperature: {temperature.toFixed(1)}</h3>
              <button 
                className="reset-button" 
                onClick={handleReset}
                disabled={temperature === DEFAULT_TEMPERATURE}
              >
                Reset
              </button>
            </div>
            
            <div className="temperature-labels">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
            
            <input
              type="range"
              min={MIN_TEMPERATURE}
              max={MAX_TEMPERATURE}
              step={TEMPERATURE_STEP}
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="temperature-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSettings;