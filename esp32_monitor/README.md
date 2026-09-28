# Monitor ESP32 do Agendamento de Salas

Este módulo conecta o sistema web a um monitor físico baseado em **ESP32 + display TFT ILI9341**.

## Fluxo

Sistema Web/SQLite -> API Node.js -> Wi-Fi -> ESP32 -> Display TFT

O monitor consulta a API a cada 10 segundos e mostra:

- **LIVRE**: não existe reserva aprovada/em uso no momento.
- **OCUPADA**: existe reserva aprovada/em uso no horário atual.
- **INDISPONÍVEL**: o Coordenador marcou a sala como indisponível.
- Próximo horário, professor e finalidade.

## Componentes

- ESP32 DevKit V1
- Display TFT 2.4" ou 2.8" com controlador ILI9341
- Jumpers
- Fonte USB 5 V

## Ligações ILI9341 -> ESP32

| Display | ESP32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| SCK/CLK | GPIO 18 |
| MOSI/SDI | GPIO 23 |
| MISO/SDO | GPIO 19 |
| CS | GPIO 5 |
| DC/RS | GPIO 2 |
| RST | GPIO 4 |
| LED | 3V3 (se necessário) |

## Bibliotecas da Arduino IDE

Instale:

- Adafruit GFX Library
- Adafruit ILI9341
- ArduinoJson

`WiFi`, `HTTPClient` e `SPI` já fazem parte do pacote ESP32.

## Configuração

No `monitor.ino`, altere:

```cpp
const char* WIFI_SSID = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";
const char* SERVER_HOST = "192.168.0.100";
const int ROOM_ID = 1;
```

O `SERVER_HOST` deve ser o IPv4 do computador que está executando o Node.js. **Não use `localhost`**.

A chave deve ser igual à `MONITOR_API_KEY` do `.env` do sistema.

## Executar o sistema

No computador:

```bash
npm install
node seed.js
node index.js
```

Descubra o IP do computador:

```bash
ipconfig
```

Procure o **Endereço IPv4** da conexão Wi-Fi/Ethernet.

O ESP32 e o computador precisam estar na mesma rede.

## Teste da API

Com o servidor ligado, a rota do monitor é:

`GET http://IP_DO_PC:3001/api/monitor/salas`

Header obrigatório:

`X-Monitor-Key: SENAI-MONITOR-2026`

O monitor não usa o login do Professor/Coordenador. Isso evita colocar credenciais de usuário dentro do firmware.
