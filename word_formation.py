import random
import string

# Generate a random uppercase alphabet
def predict():
    random_alphabet = random.choice(string.ascii_uppercase)
    return random_alphabet

def alphabet_to_number(char):
    if char.isupper():  # if the character is uppercase
        return ord(char) - ord('A')
    else:  # if the character is lowercase
        return ord(char) - ord('a')


word_arr = []
sent_arr = []
char_arr = [0]*27
frame_count = 0


while( frame_count != 30 ):
    label = predict()
    arr_idx = alphabet_to_number(label)
    char_arr[arr_idx] += 1
    frame_count += 1


print(char_arr)
word_arr.append(chr(65 + char_arr.index(max(char_arr))))
print(word_arr)
frame_count = 0
char_arr = [0]*26
print("After:",char_arr)

#after spacebar
if (word_arr[-1] == ' '):
    sent_arr.append(''.join(word_arr))
    word_arr = []
