import base64
import io
from io import BytesIO
from PIL import Image
import time
import json

#ML modules imported
import pickle
import cv2
import mediapipe as mp
import numpy as np
import asyncio
import websockets

# app = Flask(__name__)
# CORS(app)
model_dict = pickle.load(open('./modelPRJ2.p', 'rb'))
model = model_dict['model']
coon=[]

#storing word and sentences
sent_arr = []
word_arr = []
frame_count = [0]
char_arr = [0]*27

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
hands = mp_hands.Hands(static_image_mode=True, min_detection_confidence=0.2, max_num_hands=1)
labels_dict = {0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J', 10: 'K', 11: 'L',
               12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T', 20: 'U', 21: 'V', 22: 'W',
               23: 'X', 24: 'Y', 25: 'Z', 26: ' '}
allis=[1,2,3,4]
messa=json.dumps(allis)


async def predict(data):
    # data = json.loads(request.data)
    # print(len(coon))
    data = data[22:]
    image_bytes = base64.b64decode(data)
    image_data = BytesIO(image_bytes)
    image = Image.open(image_data).convert('RGB')
    image_array = np.array(image)

    data_aux = []
    x_ = []
    y_ = []

    frame = image_array
    H, W, _ = frame.shape
    # frame_rgb will store a RGB format image
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(frame_rgb)
    if results.multi_hand_landmarks:
        xxi = float('inf')
        yyi = float('inf')
        for hand_landmarks in results.multi_hand_landmarks:
            land_len = len(hand_landmarks.landmark)

            for i in range(land_len):
                x = hand_landmarks.landmark[i].x
                y = hand_landmarks.landmark[i].y
                x_.append(x)
                xxi = min(x, xxi)
                y_.append(y)
                yyi = min(y, yyi)

            for i in range(land_len):
                x = hand_landmarks.landmark[i].x
                y = hand_landmarks.landmark[i].y
                data_aux.append(x - xxi)
                data_aux.append(y - yyi)

        # trucate values for second hand
        data_aux = data_aux[:42]
        # predict the alphabet value
        prediction = model.predict([np.asarray(data_aux)])
        predicted_character = labels_dict[int(prediction[0])]
        print(predicted_character)

        #Sentence code
        if frame_count[0] == 30:
            frame_count[0] = 0
            maxi = char_arr.index(max(char_arr))
            if maxi == 26:
                if word_arr:
                    word_arr.clear()
                if sent_arr:
                    if sent_arr and sent_arr[-1]==' ':
                        pass
                    else:
                        sent_arr.append(' ')

            else:
                maxi += 65
                word_arr.append(chr(maxi))
                if sent_arr:
                    sent_arr[-1] = ''.join(word_arr)
                else:
                    sent_arr.append(''.join(word_arr))

            if len(coon) == 1 or len(coon) == 2:
                print('Breaks')
                for co in coon:
                    await co.send(json.dumps(sent_arr))
                # print("sleeping")
                # time.sleep(2)
            for ll in range(27):
                char_arr[ll]=0
        else:
            if predicted_character == ' ':
                char_arr[26] += 1
            else:
                arr_idx = ord(predicted_character)-ord('A')
                print(arr_idx,frame_count[0])
                char_arr[arr_idx] += 1
            frame_count[0] += 1




    frame=None
    frame_rgb=None
    # await asyncio.sleep(0.01)
    return 0



async def handle_conn(ws,path):
    print(ws)
    if len(coon) != 2:
        coon.append(ws)

    async for framess in ws:
        a = await predict(framess)



async def start_server():
    async with websockets.serve(handle_conn, 'localhost', 8000, max_size=5000000):
        await asyncio.Future()  # Run forever

asyncio.run(start_server())

