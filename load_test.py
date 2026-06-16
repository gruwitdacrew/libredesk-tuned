import asyncio
import aiohttp
import json
import time
import random
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Optional
import statistics

@dataclass
class TestConfig:
    base_url: str = "http://localhost:9000"
    inbox_id: str = "0f96a6a7-8e24-4103-bf45-bc59294dd572"
    
    duration_seconds: int
    users: int
    messages_per_minute: int
    
    questions: List[str] = field(default_factory=lambda: [
        "Какой курс подойдет геологу?", "Какой курс подойдет нефтянику?", "Какой курс подойдет инженеру по бурению?",
        "Сколько стоит обучение?", "Есть ли скидки?", "Можно ли оплатить по частям?",
        "Как долго длится курс?", "Выдаётся ли сертификат?", "Какие документы нужны?",
        "Кто ведёт курсы?",
    ])

@dataclass
class Metrics:
    total_messages: int = 0
    successful_messages: int = 0
    failed_messages: int = 0
    response_times: List[float] = field(default_factory=list)

class LoadTester:
    def __init__(self, config: TestConfig):
        self.config = config
        self.metrics = Metrics()
        self.active_sessions = 0
        self.lock = asyncio.Lock()
    
    async def init_conversation(self, session: aiohttp.ClientSession) -> tuple[Optional[str], Optional[str]]:
        """Создание новой беседы. Возвращает (session_token, conversation_uuid)"""
        try:
            async with session.post(
                f"{self.config.base_url}/api/v1/widget/chat/conversations/init",
                headers={"X-Libredesk-Inbox-ID": self.config.inbox_id},
                json={}
            ) as resp:
                data = await resp.json()
                session_token = data.get("data", {}).get("session_token")
                conversation_uuid = data.get("data", {}).get("conversation_uuid")
                return session_token, conversation_uuid
        except Exception as e:
            print(f"Init error: {e}")
            return None, None
    
    async def connect_websocket(self, session: aiohttp.ClientSession, token: str) -> Optional[aiohttp.ClientWebSocketResponse]:
        """Подключение к WebSocket и JOIN"""
        try:
            ws_url = self.config.base_url.replace("http", "ws") + "/widget/ws"
            ws = await session.ws_connect(ws_url)
            
            await ws.send_json({
                "type": "JOIN",
                "token": token,
                "data": {"inbox_id": self.config.inbox_id}
            })
            return ws
        except Exception as e:
            print(f"WebSocket error: {e}")
            return None
    
    async def send_message(self, session: aiohttp.ClientSession, token: str, conv_uuid: str, message: str) -> bool:
        """Отправка сообщения через HTTP. Возвращает успех/неудачу"""
        try:
            async with session.post(
                f"{self.config.base_url}/api/v1/widget/chat/conversations/{conv_uuid}/message",
                headers={
                    "X-Libredesk-Inbox-ID": self.config.inbox_id,
                    "Authorization": f"Bearer {token}"
                },
                json={"message": message}
            ) as resp:
                return resp.status == 200
        except Exception:
            return False
    
    async def listen_websocket(self, ws: aiohttp.ClientWebSocketResponse, response_queue: asyncio.Queue):
        """Фоновый слушатель WebSocket"""
        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    if data.get("type") == "NEW_MESSAGE":
                        await response_queue.put(time.time())
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    break
        except Exception:
            pass
    
    async def simulate_user(self, user_id: int):
        """Симуляция одного пользователя"""
        async with aiohttp.ClientSession() as session:
            # 1. Инициализация беседы
            token, conv_uuid = await self.init_conversation(session)
            if not token or not conv_uuid:
                return
            
            # 2. Подключение к WebSocket
            ws = await self.connect_websocket(session, token)
            if not ws:
                return
            
            # 3. Очередь для ответов
            response_queue = asyncio.Queue()
            listener = asyncio.create_task(self.listen_websocket(ws, response_queue))
            
            async with self.lock:
                self.active_sessions += 1
            
            interval = 60.0 / self.config.messages_per_minute
            end_time = time.time() + self.config.duration_seconds
            
            while time.time() < end_time:
                question = random.choice(self.config.questions)
                send_time = time.time()
                
                # 4. Отправка сообщения
                success = await self.send_message(session, token, conv_uuid, question)
                
                if not success:
                    async with self.lock:
                        self.metrics.total_messages += 1
                        self.metrics.failed_messages += 1
                    await asyncio.sleep(interval)
                    continue
                
                # 5. Ожидание ответа через WebSocket (таймаут 30 сек)
                try:
                    receive_time = await asyncio.wait_for(response_queue.get(), timeout=30.0)
                    elapsed = receive_time - send_time
                    
                    async with self.lock:
                        self.metrics.total_messages += 1
                        self.metrics.successful_messages += 1
                        self.metrics.response_times.append(elapsed)
                except asyncio.TimeoutError:
                    async with self.lock:
                        self.metrics.total_messages += 1
                        self.metrics.failed_messages += 1
                
                await asyncio.sleep(interval)
            
            listener.cancel()
            await ws.close()
            
            async with self.lock:
                self.active_sessions -= 1
    
    async def run(self):
        """Запуск теста"""
        print(f"\n{'='*60}")
        print(f"НАГРУЗОЧНЫЙ ТЕСТ")
        print(f"{'='*60}")
        print(f"Пользователей: {self.config.users}")
        print(f"Длительность: {self.config.duration_seconds} сек")
        print(f"Сообщений/мин: {self.config.messages_per_minute}")
        print(f"{'='*60}\n")
        
        # Мониторинг
        async def monitor():
            while True:
                await asyncio.sleep(5)
                active = self.active_sessions
                total = self.metrics.total_messages
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Активно: {active}, Сообщений: {total}")
        
        monitor_task = asyncio.create_task(monitor())
        start_time = time.time()
        
        # Запуск всех пользователей
        tasks = [asyncio.create_task(self.simulate_user(i)) for i in range(self.config.users)]
        await asyncio.gather(*tasks)
        
        monitor_task.cancel()
        total_time = time.time() - start_time
        self.print_results(total_time)
    
    def print_results(self, total_time: float):
        total = self.metrics.total_messages
        success = self.metrics.successful_messages
        failed = self.metrics.failed_messages
        times = self.metrics.response_times
        
        rps = total / total_time
        
        print(f"\n{'='*60}")
        print(f"РЕЗУЛЬТАТЫ")
        print(f"{'='*60}")
        print(f"  Длительность: {total_time:.2f} сек")
        print(f"  Пользователей: {self.config.users}")
        print(f"  Всего сообщений: {total}")
        print(f"  Успешно: {success}")
        print(f"  Ошибок: {failed}")
        print(f"  Успешность: {success/total*100:.1f}%" if total > 0 else "  Успешность: -")
        print(f"  RPS: {rps:.2f}")
        
        if times:
            print(f"\n⏱️ ВРЕМЯ ОТВЕТА (сек):")
            print(f"  Среднее: {statistics.mean(times):.3f}")
            print(f"  Медиана: {statistics.median(times):.3f}")
            print(f"  p95: {self.percentile(times, 95):.3f}")
            print(f"  p99: {self.percentile(times, 99):.3f}")
            print(f"  Мин: {min(times):.3f}")
            print(f"  Макс: {max(times):.3f}")
        print(f"{'='*60}\n")
    
    @staticmethod
    def percentile(data: List[float], p: float) -> float:
        if not data:
            return 0
        k = (len(data) - 1) * p / 100
        f = int(k)
        c = k - f
        if f + 1 < len(data):
            return data[f] + c * (data[f+1] - data[f])
        return data[f]

async def main():
    # Тест 1: Долгая лёгкая нагрузка
    config1 = TestConfig(
        users=5,
        duration_seconds=120,
        messages_per_minute=1
    )

    # Тест 2: Средняя нагрузка
    config2 = TestConfig(
        users=10,
        duration_seconds=90,
        messages_per_minute=2
    )

    # Тест 3: Кратковременная высокая нагрузка
    config3 = TestConfig(
        users=20,
        duration_seconds=60,
        messages_per_minute=2
    )
    
    tester1 = LoadTester(config1)
    await tester1.run()

if __name__ == "__main__":
    asyncio.run(main())