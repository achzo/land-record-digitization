from pathlib import Path
from typing import Optional
import yaml
from pydantic import BaseModel, Field


class ActiveLearningConfig(BaseModel):
    enabled: bool = Field(default=True)
    min_verified_samples_for_training: int = Field(default=20)
    validation_split: float = Field(default=0.15)
    min_improvement: float = Field(default=0.01)
    auto_train: bool = Field(default=False)
    tolerance: float = Field(default=0.02, description="Benchmark degradation tolerance allowed during evaluation")


def load_active_learning_config(config_path: Optional[str] = None) -> ActiveLearningConfig:
    candidate_paths = []
    if config_path:
        candidate_paths.append(Path(config_path))
    
    # Check standard locations
    candidate_paths.extend([
        Path("configs/active_learning.yaml"),
        Path("../configs/active_learning.yaml"),
        Path(__file__).resolve().parent.parent.parent.parent / "configs" / "active_learning.yaml",
        Path(__file__).resolve().parent.parent.parent / "configs" / "active_learning.yaml",
    ])

    for p in candidate_paths:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    raw_data = yaml.safe_load(f)
                    if raw_data and "active_learning" in raw_data:
                        return ActiveLearningConfig(**raw_data["active_learning"])
                    elif raw_data:
                        return ActiveLearningConfig(**raw_data)
            except Exception:
                pass

    return ActiveLearningConfig()


# Singleton instance
active_learning_config = load_active_learning_config()
