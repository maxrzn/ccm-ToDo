'use strict';

ccm.files['ccm.todo.js'] = {
    name: 'todo',
    ccm: '././libs/ccm/ccm.js',
    config: {
        cat: ['ccm.store', {
            name: "mziege2s_categories",
            url: "https://ccm2.inf.h-brs.de"
        }],
        task: ['ccm.store', {
            name: "mziege2s_tasks",
            url: "https://ccm2.inf.h-brs.de"
        }],
        html: ['ccm.load', '././resources/templates.html'],
        css: ['ccm.load', '././resources/styles.css']
    },


    Instance: function () {
        const userId = "testuser";
        this.start = async()=> {
            //append main areas
            const main = this.ccm.helper.html(this.html.main);
            this.element.innerHTML = "";
            this.element.appendChild((this.ccm.helper.html(this.html.header, {userId: userId})));
            this.element.appendChild(main);
            main.appendChild(this.ccm.helper.html(this.html.catArea));
            main.appendChild(this.ccm.helper.html(this.html.taskArea));

            const userCats = await this.cat.get({ownerId: userId}); //check for existing categories
            if(!userCats.length) {
                await this.cat.set({    //create Default category
                    title: "default",
                    ownerId : userId,
                    members : []
                });
            } else {
                const defaultCatKey = (await this.cat.get({
                    ownerId: userId,
                    title: "default"
                }))[0].key;
                await this.showTasks(defaultCatKey);
            }
            //show categories
            await this.showCategories();

            //open Category creation box button
            this.element.querySelector("#newCatButton").addEventListener("click", (e) => {
                this.element.querySelector("#newCatBox").classList.toggle("hidden", false);
                this.element.querySelector("#catTitle").focus();
                e.target.disabled = true;
            });

            //enter event listener
            this.element.querySelector("#catTitle").addEventListener("keypress", (e) => {
                if (e.key==='Enter') this.element.querySelector("#createCat").click();
            });

            //create Category
            this.element.querySelector("#createCat").addEventListener("click", async () => {
                const title = this.element.querySelector("#catTitle").value;
                const newCat = await this.cat.set({    //create Default category
                    title: title,
                    ownerId : userId,
                    members : []
                });
                this.closeNewCatBox();
                await this.insertCategory(await this.cat.get(newCat));
            });

            //cancel Category creation
            this.element.querySelector("#cancelCatCreation").addEventListener("click", () =>this.closeNewCatBox());
            this.closeNewCatBox = () => {
                console.log("cancel");
                this.element.querySelector("#newCatBox").classList.toggle("hidden", true);
                this.clearInputs();
                this.element.querySelector("#newCatButton").disabled = false;
            }

            //open new Task creation
            const newTaskButton = this.element.querySelector("#newTaskButton");
            const newTaskBox = this.element.querySelector('#newTaskBox');
            newTaskButton.addEventListener("click", () => {
                newTaskButton.disabled = true;
                newTaskBox.classList.remove("hidden");
                newTaskBox.querySelector("#taskContent").focus();
            });

            //create new Task
            const createTaskButton = this.element.querySelector("#createTaskButton");
            const inputFields = this.element.querySelectorAll("#newTaskBox input");
            inputFields.forEach((input) => {
                input.addEventListener("keypress", (e) => {
                    if (e.key==='Enter') createTaskButton.click();
                });
            });
            createTaskButton.addEventListener("click", async() => {
                const categoryId = this.element.querySelector("#categoryList .selected").id;
                const newTask = await this.task.set({
                    content: this.element.querySelector("#taskContent").value,
                    deadline: this.element.querySelector("#taskDeadline").value,
                    points: this.element.querySelector("#taskPoints").value,
                    status: "open",
                    categoryId: categoryId,
                    userId: userId
                });
                newTaskBox.classList.add("hidden");
                newTaskButton.disabled = false;
                this.clearInputs();
                //show updated Tasklist
                this.insertOpenTask(await this.task.get(newTask))
            });

            //cancel Task creation
            const cancelTaskButton = this.element.querySelector('#cancelTaskButton');
            cancelTaskButton.addEventListener("click", () => {
              newTaskBox.classList.add("hidden");
              newTaskButton.disabled = false;
              this.clearInputs();
            });

            //clear history Button
            const clearHistoryButton = this.element.querySelector("#clearHistoryButton");
            clearHistoryButton.addEventListener("click", async() =>  await this.deleteAllTasks("closed"));

        }
        /**
         * shows all categories
         * @returns {Promise<void>}
         */
        this.showCategories = async() => {
            const cats = await this.cat.get({ownerId: userId});
            for (const cat of cats) {
                await this.insertCategory(cat);
            }
        }
        /**
         * creates category and displays it
         * @returns {Promise<void>}
         */
        this.createCategory = async () => {

        }
        /**
         * inserts a single cat element into div #categoryList
         * @param cat category object from database
         * @returns {Promise<void>}
         */
        this.insertCategory = async(cat) => {
            const taskCount = (await this.task.get({categoryId : cat.title, status:"open"})).length;
            const newCat = this.ccm.helper.html(this.html.category, {categoryKey:cat.key ,title:cat.title, taskCount:taskCount });
            if(cat.title === "default") {
                newCat.querySelector(".catStandard").classList.remove("hidden");
                newCat.classList.add("selected");
            }
            newCat.addEventListener("click", (e) => this.selectCategory(e));
            this.element.querySelector("#categoryList").append(newCat);
        }

        this.selectCategory = async(e) => {
            if(e.target.classList.contains("selected")) return; //category already Selected
            this.element.querySelector("#newTaskBox").classList.toggle("hidden", true);//close task creation window if necessary
            this.element.querySelector("#newTaskButton").disabled = false; //enable button
            this.highlightCategory(e.target);
            await this.showTasks(e.target.id);
        }
        /**
         * iterates through tasks list, shows open tasks and completed task
         * @returns {Promise<void>}
         */
        this.showTasks = async(categoryKey) => {
            const categoryName = (await this.cat.get(categoryKey)).title;
            const tasks = await this.task.get({categoryId: categoryKey });
            console.log(tasks);
            this.element.querySelector("#categoryTitle").innerHTML = categoryName; //change category name
            this.element.querySelector("#taskList").innerHTML = "";
            this.element.querySelector("#taskHistory").innerHTML = "";
            if(tasks.length) {
                tasks.forEach((task) => {
                    if(task.status==="open") {
                        this.insertOpenTask(task);
                    } else {
                        this.insertCompletedTask(task);
                    }
                });
            }
            this.updateHistoryVisibility();
            this.updateNoTaskInfo();
            //TODO remove
            const ts = await this.task.get();
            console.log(ts);
        }
        /**
         * inserts completed task into taskList div
         * @param task task object
         */
        this.insertOpenTask = (task) => {
            const taskList = this.element.querySelector("#taskList");
            const taskDeadline = task.deadline ? new Date(task.deadline).toLocaleDateString("De-de") : "";
            const taskel = this.ccm.helper.html(this.html.task, {
                taskContent: task.content,
                taskPoints: task.points ?? "",
                taskDeadline: taskDeadline
            });
            taskel.setAttribute("id", task.key);
            //deleteTask Button
            taskel.querySelector(".deleteTaskButton").addEventListener("click", async (e) => {
                const taskDiv = e.target.closest("div[id]");
                taskDiv.remove();
                this.task.del(taskDiv.getAttribute("id"));
                this.updateNoTaskInfo();
                //TODO trigger tasklist refresh for other participants if needed
            });
            //completeTask Button
            taskel.querySelector(".completeTaskButton").addEventListener("click", async (e) => {
                const taskHistory = this.element.querySelector("#taskHistory");
                const taskDiv = e.target.closest("div[id]");
                taskDiv.remove();
                const taskKey = taskDiv.getAttribute("id");
                this.task.set({key : taskKey, status : 'closed' });
                this.insertCompletedTask(await this.task.get(taskKey));
                this.updateNoTaskInfo();
                this.updateHistoryVisibility();
                //TODO trigger tasklist refresh for other participants if needed
            })
            taskList.prepend(taskel);
            this.updateNoTaskInfo();
        }
        /**
         * inserts completed task as first Child of taskHistory div
         * @param task task object
         */
        this.insertCompletedTask = (task) => {
            const taskHistory = this.element.querySelector("#taskHistory");
            taskHistory.classList.toggle("hidden", false);
            const points = task.points ? "+" + task.points + " Punkte" : "";
            const taskel = this.ccm.helper.html(this.html.completedTask, {
                completedContent: task.content,
                points: points,
                completedDate:  new Date().toLocaleDateString("de-DE")
            });
            taskel.setAttribute("id", task.key);
            taskHistory.prepend(taskel);
        }

        this.updateNoTaskInfo = () => {
            const noTaskInfo = this.element.querySelector("#noTaskInfo");
            const taskList = this.element.querySelector("#taskList");
            noTaskInfo.classList.toggle("hidden", taskList.hasChildNodes());
        }

        this.updateHistoryVisibility = () => {
            const history = this.element.querySelector("#historyArea");
            const t = this.element.querySelectorAll("#taskHistory .taskHistory-row");
            if (!history) return;
            history.classList.toggle("hidden", t.length === 0);
        }

        this.clearInputs = () => {
            const input = this.element.querySelectorAll("input");
            input.forEach((i) => {
                i.value = "";
            });
        }

        this.deleteAllCategories = async() => {
            const cats = await this.cat.get();
            cats.forEach((element) => {
                this.cat.del(element.key);
                console.log("Category: " + element.key + " wurde ausradiert!");
            });

        }
        this.deleteAllTasks = async(status) => {
            const tasks = await this.task.get({status : status});
            tasks.forEach(element => {
                this.task.del(element.key);
                console.log("Task: " + element.key + " wurde ausradiert!");
            });
            if(status === "closed") {
                const t = this.element.querySelectorAll("#taskHistory .taskHistory-row");
                t.forEach((t) => t.remove());
                this.updateHistoryVisibility();
            }
        }
        this.highlightCategory = (target) => {
            this.element.querySelector("#categoryList .selected").classList.remove("selected");
            target.classList.add("selected");
        }
    },
}

//TODO grid layout for main areas, category height indepenent from task window height

