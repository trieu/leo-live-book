import random
from dataclasses import dataclass, replace
from typing import Dict, Tuple, List


# =========================================================
# 1. HUMAN + SUPEREGO (STATE SPACE)
# =========================================================

@dataclass(frozen=True)
class Human:
    """
    Đại diện cho 'user state' trong hệ thống.
    Đây chính là embedding của con người trong không gian đạo đức.
    """
    name: str
    faith: float = 0.5        # Đức tin (Paul, Luther)
    sin_level: float = 0.5    # Mức lệch chuẩn (Augustine)
    reason: float = 0.5       # Lý trí (Aquinas)
    emotion: float = 0.5      # Cảm xúc (Schleiermacher)
    discipline: float = 0.5   # Kỷ luật (Calvin)

    def clamp(self, value: float) -> float:
        return max(0.0, min(1.0, value))


@dataclass(frozen=True)
class Superego:
    """
    Jesus + Maria = vector lý tưởng (ground truth)
    """
    love: float = 1.0
    purity: float = 0.0   # sin = 0 là ideal
    truth: float = 1.0
    fidelity: float = 1.0


# =========================================================
# 2. ENVIRONMENT: TEMPTATION (NOISE / DRIFT)
# =========================================================

class WorldlyTemptation:
    """
    Mô phỏng 'world noise' → giống production environment drift
    """
    def __init__(self, intensity=0.15, probability=0.3):
        self.intensity = intensity
        self.probability = probability

    def disturb(self, human: Human) -> Human:
        if random.random() < self.probability:
            # temptation = tăng sin + giảm discipline
            return replace(
                human,
                sin_level=human.clamp(human.sin_level + random.uniform(0, self.intensity)),
                discipline=human.clamp(human.discipline - random.uniform(0, self.intensity / 2))
            )
        return human


# =========================================================
# 3. REWARD FUNCTION (TEN COMMANDMENTS ENGINE)
# =========================================================

class EthicsEngine:
    """
    Reward = alignment với 10 điều răn (simplified multi-objective scoring)
    """

    @staticmethod
    def evaluate(h: Human, target: Superego) -> float:
        # 1–3: faith
        faith_score = h.faith

        # 4: discipline (hiếu thảo, trách nhiệm)
        discipline_score = h.discipline

        # 5–9: đạo đức hành vi
        moral_score = 1.0 - h.sin_level

        # truth (Aquinas)
        truth_score = h.reason

        # 10: kiểm soát ham muốn (emotion balance)
        desire_control = 1.0 - abs(h.emotion - 0.5)

        # weighted sum (có thể tuning)
        return (
            0.25 * faith_score +
            0.2 * discipline_score +
            0.25 * moral_score +
            0.15 * truth_score +
            0.15 * desire_control
        )


# =========================================================
# 4. THINKER ACTIONS = POLICY SPACE
# =========================================================

class ThinkerCatalog:
    """
    Mỗi thinker = 1 transformation function
    """

    @staticmethod
    def apply(h: Human, action: str) -> Human:

        # ----------------------------------
        # PAUL → Rule-based (faith boost)
        # ----------------------------------
        if action == "PAUL":
            return replace(h, faith=h.clamp(h.faith + 0.12))

        # ----------------------------------
        # AUGUSTINE → giảm sin (self-awareness)
        # ----------------------------------
        if action == "AUGUSTINE":
            return replace(h, sin_level=h.clamp(h.sin_level - 0.12))

        # ----------------------------------
        # AQUINAS → tăng reason (logic)
        # ----------------------------------
        if action == "AQUINAS":
            return replace(h, reason=h.clamp(h.reason + 0.1))

        # ----------------------------------
        # LUTHER → faith mạnh (direct connection)
        # ----------------------------------
        if action == "LUTHER":
            return replace(h, faith=h.clamp(h.faith + 0.18))

        # ----------------------------------
        # CALVIN → discipline (system behavior)
        # ----------------------------------
        if action == "CALVIN":
            return replace(h, discipline=h.clamp(h.discipline + 0.15))

        # ----------------------------------
        # SCHLEIERMACHER → emotional alignment
        # ----------------------------------
        if action == "SCHLEIERMACHER":
            return replace(h, emotion=(h.emotion + 0.5) / 2)

        # ----------------------------------
        # BARTH → stochastic (black-box God)
        # ----------------------------------
        if action == "BARTH":
            if random.random() > 0.5:
                return replace(h, faith=h.clamp(h.faith + 0.2))
            else:
                return replace(h, sin_level=h.clamp(h.sin_level - 0.2))

        return h


# =========================================================
# 5. RL AGENT (Q-LEARNING IMPROVED)
# =========================================================

class ChristianAgent:

    def __init__(self, actions: List[str]):
        self.q_table: Dict[Tuple, Dict[str, float]] = {}
        self.actions = actions

        # tuning params
        self.alpha = 0.1
        self.gamma = 0.95
        self.epsilon = 0.3
        self.epsilon_decay = 0.999
        self.epsilon_min = 0.05

    def get_state(self, h: Human) -> Tuple:
        """
        State discretization → giảm state space
        """
        return (
            round(h.faith, 1),
            round(h.sin_level, 1),
            round(h.discipline, 1),
            round(h.reason, 1),
        )

    def ensure_state(self, state):
        if state not in self.q_table:
            self.q_table[state] = {a: 0.0 for a in self.actions}

    def choose_action(self, state: Tuple) -> str:
        self.ensure_state(state)

        # exploration vs exploitation
        if random.random() < self.epsilon:
            return random.choice(self.actions)

        return max(self.q_table[state], key=self.q_table[state].get)

    def learn(self, s, a, r, s_next):
        self.ensure_state(s_next)

        best_next = max(self.q_table[s_next].values())

        # Q-learning update
        self.q_table[s][a] += self.alpha * (
            r + self.gamma * best_next - self.q_table[s][a]
        )

        # decay exploration
        self.epsilon = max(self.epsilon * self.epsilon_decay, self.epsilon_min)


# =========================================================
# 6. TRAINING LOOP
# =========================================================

if __name__ == "__main__":

    thinkers = [
        "PAUL", "AUGUSTINE", "AQUINAS",
        "LUTHER", "CALVIN", "SCHLEIERMACHER", "BARTH"
    ]

    subject = Human(name="Thomas", faith=0.3, sin_level=0.7, discipline=0.2)
    print("\nInit State:", subject)
    ideal = Superego()

    agent = ChristianAgent(thinkers)
    temptation = WorldlyTemptation(intensity=0.1, probability=0.1)

    print("\n=== TRAINING 2000 STEPS ===\n")

    for step in range(1, 2001):

        # 1. observe state
        s = agent.get_state(subject)

        # 2. choose thinker (policy)
        action = agent.choose_action(s)

        # 3. apply transformation
        subject = ThinkerCatalog.apply(subject, action)

        # 4. environment noise
        subject = temptation.disturb(subject)

        # 5. reward
        reward = EthicsEngine.evaluate(subject, ideal)

        # 6. learn
        s_next = agent.get_state(subject)
        agent.learn(s, action, reward, s_next)

        if step % 500 == 0:
            print(f"Step {step}: reward={reward:.3f}, epsilon={agent.epsilon:.3f}")

    print("\nFinal State:", subject)