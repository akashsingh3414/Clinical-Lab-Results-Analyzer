import logging
import warnings

warnings.filterwarnings("ignore", message="Direct use of automatic function calling")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger("lab-agent")
